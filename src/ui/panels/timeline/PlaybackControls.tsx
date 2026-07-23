import React from 'react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { usePreviewResolutionStore } from '../../../state/previewResolutionStore';
import { useRamPreviewStore } from '../../../state/ramPreviewStore';
import { AnimationClock } from '../../../animation/AnimationClock';
import { frameCache } from '../../../renderer/cache/FrameCache';

import type { Composition } from '../../../types/composition';

interface Props {
  comp: Composition;
  totalFrames: number;
  currentFrame: number;
}

export const animationClock = new AnimationClock();

// ── Cache-only playback helpers ─────────────────────────────────

function getWorkAreaFrames(comp: Composition): { start: number; end: number } {
  const fps = comp.fps;
  const total = Math.floor(comp.duration * fps);
  const start = comp.workAreaStart != null
    ? Math.floor(comp.workAreaStart * fps)
    : 0;
  const end = comp.workAreaEnd != null
    ? Math.floor(comp.workAreaEnd * fps)
    : total;
  return {
    start: Math.max(0, start),
    end:   Math.min(total, end),
  };
}

/**
 * Check if the work area is fully cached and blit-only playback is viable.
 * Uses the fast RamCache path — no async.
 */
function canBlitPlay(comp: Composition): boolean {
  const { start, end } = getWorkAreaFrames(comp);
  if (end <= start) return false;
  return frameCache.isRangeCached(comp, start, end);
}

export const PlaybackControls: React.FC<Props> = ({ comp, totalFrames }) => {
  const loop = useTimelineStore((s) => s.loop);
  const setPlaybackState = useTimelineStore((s) => s.setPlaybackState);
  const isBuilding = useRamPreviewStore(s => s.isBuilding);
  const buildProgress = useRamPreviewStore(s => s.progress);
  const startBuild = useRamPreviewStore(s => s.startBuild);
  const stopBuild = useRamPreviewStore(s => s.stopBuild);

  React.useEffect(() => {
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');
    // Sync work area to the clock — only respected when enabled
    const workAreaEnabled = !!comp.workAreaEnabled;
    animationClock.setUseWorkArea(workAreaEnabled);
    if (workAreaEnabled) {
      const wsFrame = Math.floor((comp.workAreaStart ?? 0) * comp.fps);
      const weFrame = Math.floor((comp.workAreaEnd ?? comp.duration) * comp.fps);
      animationClock.setWorkArea(wsFrame, weFrame);
    }
  }, [
    comp.fps, totalFrames, loop,
    comp.workAreaEnabled, comp.workAreaStart, comp.workAreaEnd, comp.duration,
  ]);

  // ── Refresh ruler cache bar periodically ────────────────────
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!isBuilding) {
        useRamPreviewStore.getState().refreshCachedFrames(comp.id);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [comp.id, isBuilding]);

  React.useEffect(() => {
    useRamPreviewStore.getState().refreshCachedFrames(comp.id);
  }, [comp.id]);

  React.useEffect(() => {
    const compId = comp.id;

    // ── onFrame: normal render-loop playback ───────────────────
    const onFrame = (ev: { frame: number; time: number }) => {
      const isPlaying = useTimelineStore.getState().playbackState === 'playing';
      const renderer = (window as any).__renderer;
      if (isPlaying) {
        // Silent write — no React re-renders. Renderer reads via getState()
        // on its next tick. Render loop already runs continuously during playback.
        useCompositionStore.getState().setCurrentTimeSilent(compId, ev.time);
        // Only nudge render if idle-paused (first frame after play started)
        if (renderer && renderer.renderLoop.idlePaused) renderer.renderLoop.requestRender();
      } else {
        useCompositionStore.getState().setCurrentTime(compId, ev.time);
        if (renderer) renderer.renderLoop.requestRender();
      }
    };

    // ── onPlay: decide normal vs blit-only mode ────────────────
    const onPlay = () => {
      setPlaybackState('playing');
      usePreviewResolutionStore.getState().setPlaybackActive(true);

      const cs = useCompositionStore.getState();
      const liveComp = cs.compositions.find(c => c.id === compId);
      const renderer = (window as any).__renderer;

      if (renderer?.propertyBinder) renderer.propertyBinder.setActive(true);

      // ── Attempt cache-only (blit) playback ──────────────────
      if (liveComp && renderer?.renderLoop) {
        const { start, end } = getWorkAreaFrames(liveComp);
        const canBlit = canBlitPlay(liveComp);

        console.log('[Playback] Mode decision:', {
          canBlit,
          workArea: `${start}→${end}`,
          cachedFrames: frameCache.ram.size,
        });

        if (canBlit) {
          // All frames cached — use zero-render blit playback
          const fps = liveComp.fps;
          let blitFrame = Math.floor(liveComp.currentTime * fps);

          // Clamp to work area
          if (blitFrame < start) blitFrame = start;
          if (blitFrame >= end)  blitFrame = start;

          renderer.renderLoop.startBlitPlayback(
            blitFrame,
            end,
            fps,
            loop,
            (frame: number) => {
              // Get cached ImageData for this frame
              const imageData = frameCache.getFrameSync(liveComp, frame);
              if (!imageData) return false; // cache miss → fall back

              // Blit to WebGL canvas via overlay
              frameCache.blitToCanvas(imageData, renderer.renderer.domElement);

              // Update composition time silently (no React re-render)
              useCompositionStore.getState().setCurrentTimeSilent(
                compId,
                frame / fps,
              );

              return true;
            },
          );

          // Wire blit frame notifications to animationClock for timeline UI
          renderer.renderLoop.onBlitFrame = (frame: number, timeSec: number) => {
            animationClock.seekToFrame(frame);
            // Update playhead position (RAF loop in TimelinePanel reads this)
          };

          // On blit end (non-loop): emit stop
          renderer.renderLoop.onBlitEnd = () => {
            useCompositionStore.getState().setCurrentTime(
              compId,
              animationClock.currentTime,
            );
            setPlaybackState('stopped');
            usePreviewResolutionStore.getState().setPlaybackActive(false);
            frameCache.hideOverlay();
            renderer.renderLoop.requestRender();
          };

          return; // Don't start animationClock — blit drives playback
        }
      }

      // ── Normal render-loop playback ──────────────────────────
      animationClock.play();
    };

    const onPause = () => {
      const renderer = (window as any).__renderer;

      // Stop blit loop if active
      if (renderer?.renderLoop?.isBlitMode) {
        renderer.renderLoop.stopBlitPlayback();
        renderer.renderLoop.onBlitFrame = null;
        renderer.renderLoop.onBlitEnd   = null;
        frameCache.hideOverlay();
      } else {
        animationClock.pause();
      }

      useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
      setPlaybackState('paused');
      usePreviewResolutionStore.getState().setPlaybackActive(false);

      if (renderer) {
        renderer.pauseAllVideos?.();
        renderer.pauseAllAudio?.();
        if (renderer.propertyBinder?.isActive) {
          renderer.propertyBinder.flushOverridesToStore(compId);
          renderer.propertyBinder.setActive(false);
          renderer.layerSync.restoreFromOverrides();
          renderer.layerSync.setRuntimeOverridesActive(false);
        }
        renderer.sceneManager.compBounds.show();
        renderer.sceneManager.layerGroup.visible = true;
        renderer.renderLoop.requestRender();
      }
    };

    const onStop = () => {
      const renderer = (window as any).__renderer;

      // Stop blit loop if active
      if (renderer?.renderLoop?.isBlitMode) {
        renderer.renderLoop.stopBlitPlayback();
        renderer.renderLoop.onBlitFrame = null;
        renderer.renderLoop.onBlitEnd   = null;
        frameCache.hideOverlay();
      } else {
        animationClock.stop();
      }

      useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
      setPlaybackState('stopped');
      usePreviewResolutionStore.getState().setPlaybackActive(false);

      if (renderer) {
        renderer.pauseAllVideos?.();
        renderer.pauseAllAudio?.();
        if (renderer.propertyBinder?.isActive) {
          renderer.propertyBinder.flushOverridesToStore(compId);
          renderer.propertyBinder.setActive(false);
          renderer.layerSync.restoreFromOverrides();
          renderer.layerSync.setRuntimeOverridesActive(false);
        }
        renderer.sceneManager.compBounds.show();
        renderer.sceneManager.layerGroup.visible = true;
        renderer.renderLoop.requestRender();
      }
    };

    animationClock.on('frame-changed', onFrame);
    animationClock.on('play', onPlay);
    animationClock.on('pause', onPause);
    animationClock.on('stop', onStop);


    const onPrevKf = () => {
      const cs = useCompositionStore.getState();
      const c = cs.activeCompositionId
        ? cs.compositions.find((x) => x.id === cs.activeCompositionId)
        : null;
      if (!c) return;
      import('../../../state/selectionStore').then(({ useSelectionStore }) => {
        import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
          const ids = useSelectionStore.getState().getSelectedIds();
          const eng = useKeyframeStore.getState().engine;
          let all: number[] = [];
          const src = ids.length > 0 ? ids : c.layers.map((l) => l.id);
          for (const id of src)
            all = all.concat(eng.getAllKeyframesForLayer(id).map((k) => k.time));
          const prev = [...all]
            .sort((a, b) => a - b)
            .reverse()
            .find((t) => t < animationClock.currentFrame);
          if (prev !== undefined) animationClock.seekToFrame(prev);
        });
      });
    };

    const onNextKf = () => {
      const cs = useCompositionStore.getState();
      const c = cs.activeCompositionId
        ? cs.compositions.find((x) => x.id === cs.activeCompositionId)
        : null;
      if (!c) return;
      import('../../../state/selectionStore').then(({ useSelectionStore }) => {
        import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
          const ids = useSelectionStore.getState().getSelectedIds();
          const eng = useKeyframeStore.getState().engine;
          let all: number[] = [];
          const src = ids.length > 0 ? ids : c.layers.map((l) => l.id);
          for (const id of src)
            all = all.concat(eng.getAllKeyframesForLayer(id).map((k) => k.time));
          const next = all
            .sort((a, b) => a - b)
            .find((t) => t > animationClock.currentFrame);
          if (next !== undefined) animationClock.seekToFrame(next);
        });
      });
    };

    // ── Keyboard shortcuts ─────────────────────────────────────
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      // RAM Preview: Numpad0 or Shift+Space
      const isNumpad0    = e.code === 'Numpad0';
      const isShiftSpace = e.shiftKey && e.code === 'Space';
      if (isNumpad0 || isShiftSpace) {
        e.preventDefault();
        const building = useRamPreviewStore.getState().isBuilding;
        if (building) {
          useRamPreviewStore.getState().stopBuild();
        } else {
          // Stop playback first
          const renderer = (window as any).__renderer;
          if (renderer?.renderLoop?.isBlitMode) {
            renderer.renderLoop.stopBlitPlayback();
            frameCache.hideOverlay();
          }
          animationClock.pause();
          setPlaybackState('paused');
          useRamPreviewStore.getState().startBuild(compId);
        }
        return;
      }

      // Space: play/pause (with blit-mode awareness)
      if (e.code === 'Space' && !e.shiftKey) {
        e.preventDefault();
        const renderer = (window as any).__renderer;
        const playback = useTimelineStore.getState().playbackState;

        if (playback === 'playing') {
          // Pause
          if (renderer?.renderLoop?.isBlitMode) {
            renderer.renderLoop.stopBlitPlayback();
            renderer.renderLoop.onBlitFrame = null;
            renderer.renderLoop.onBlitEnd   = null;
            frameCache.hideOverlay();
            useCompositionStore.getState().setCurrentTime(
              compId,
              animationClock.currentTime,
            );
            setPlaybackState('paused');
            usePreviewResolutionStore.getState().setPlaybackActive(false);
            renderer.renderLoop.requestRender();
          } else {
            animationClock.pause();
          }
        } else {
          // Play — animationClock.play() fires the 'play' event above
          // which decides normal vs blit mode
          animationClock.play();
        }
        return;
      }
    };

    document.addEventListener('playback:prevKeyframe', onPrevKf);
    document.addEventListener('playback:nextKeyframe', onNextKf);
    document.addEventListener('keydown', onKey);

    return () => {
      animationClock.off('frame-changed', onFrame);
      animationClock.off('play', onPlay);
      animationClock.off('pause', onPause);
      animationClock.off('stop', onStop);
      document.removeEventListener('playback:prevKeyframe', onPrevKf);
      document.removeEventListener('playback:nextKeyframe', onNextKf);
      document.removeEventListener('keydown', onKey);

    };
  }, [comp.id, setPlaybackState, loop]);

  // ── Expose globals for TimelineHeader RAM Preview button ────
  React.useEffect(() => {
    (window as any).__ramPreviewBuilding = isBuilding;
    (window as any).__ramPreviewProgress = buildProgress;
    (window as any).__ramPreviewStart    = () => startBuild(comp.id);
    (window as any).__ramPreviewStop     = stopBuild;
    document.dispatchEvent(new CustomEvent('rampreview:statechange', {
      detail: { isBuilding, progress: buildProgress },
    }));
  }, [isBuilding, buildProgress, comp.id, startBuild, stopBuild]);

  return null;
};