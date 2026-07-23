/**
 * PlaybackController — owns all animationClock event wiring at the app root.
 *
 * Mounted once in <App />, this component ensures playback keeps working
 * even when the Timeline panel is unmounted (e.g., Graph Editor–only view).
 *
 * <PlaybackControls /> is kept as a thin re-export so existing imports don't break.
 */
import React from 'react';
import { useTimelineStore } from '../state/timelineStore';
import { useCompositionStore } from '../state/compositionStore';
import { usePreviewResolutionStore } from '../state/previewResolutionStore';
import { useRamPreviewStore } from '../state/ramPreviewStore';
import { animationClock } from '../ui/panels/timeline/PlaybackControls';
import { frameCache } from '../renderer/cache/FrameCache';

import type { Composition } from '../types/composition';

// ── Cache-only playback helpers ─────────────────────────────────

function getWorkAreaFrames(comp: Composition): { start: number; end: number } {
  const fps = comp.fps;
  const total = Math.floor(comp.duration * fps);
  const start = comp.workAreaStart != null ? Math.floor(comp.workAreaStart * fps) : 0;
  const end = comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * fps) : total;
  return { start: Math.max(0, start), end: Math.min(total, end) };
}

function canBlitPlay(comp: Composition): boolean {
  const { start, end } = getWorkAreaFrames(comp);
  if (end <= start) return false;
  return frameCache.isRangeCached(comp, start, end);
}

// ── Module-level playback wiring ────────────────────────────────
// Registered once on import — never unregistered so playback works
// regardless of which panels are mounted.

let _wired = false;

function ensurePlaybackWired(): void {
  if (_wired) return;
  _wired = true;

  const getCompId = () => useCompositionStore.getState().activeCompositionId;

  animationClock.on('frame-changed', (ev: { frame: number; time: number }) => {
    const compId = getCompId();
    if (!compId) return;
    const isPlaying = useTimelineStore.getState().playbackState === 'playing';
    const renderer = (window as any).__renderer;
    if (isPlaying) {
      useCompositionStore.getState().setCurrentTimeSilent(compId, ev.time);
      if (renderer && renderer.renderLoop?.idlePaused) renderer.renderLoop.requestRender();
    } else {
      useCompositionStore.getState().setCurrentTime(compId, ev.time);
      if (renderer) renderer.renderLoop.requestRender();
    }
  });

  animationClock.on('play', () => {
    const compId = getCompId();
    if (!compId) return;
    import('../renderer/audio/audioContext').then(m => m.resumeAudio());
    useTimelineStore.getState().setPlaybackState('playing');
    usePreviewResolutionStore.getState().setPlaybackActive(true);
    const cs = useCompositionStore.getState();
    const liveComp = cs.compositions.find(c => c.id === compId);
    const renderer = (window as any).__renderer;
    if (renderer?.propertyBinder) renderer.propertyBinder.setActive(true);
    if (liveComp && renderer?.renderLoop) {
      const { start, end } = getWorkAreaFrames(liveComp);
      if (canBlitPlay(liveComp)) {
        const fps = liveComp.fps;
        let blitFrame = Math.floor(liveComp.currentTime * fps);
        if (blitFrame < start) blitFrame = start;
        if (blitFrame >= end) blitFrame = start;
        renderer.renderLoop.startBlitPlayback(blitFrame, end, fps, useTimelineStore.getState().loop, (frame: number) => {
          const imageData = frameCache.getFrameSync(liveComp, frame);
          if (!imageData) return false;
          frameCache.blitToCanvas(imageData, renderer.renderer.domElement);
          useCompositionStore.getState().setCurrentTimeSilent(compId, frame / fps);
          return true;
        });
        renderer.renderLoop.onBlitFrame = (frame: number) => { animationClock.seekToFrame(frame); };
        renderer.renderLoop.onBlitEnd = () => {
          useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
          useTimelineStore.getState().setPlaybackState('stopped');
          usePreviewResolutionStore.getState().setPlaybackActive(false);
          frameCache.hideOverlay();
          renderer.renderLoop.requestRender();
        };
        return;
      }
    }
    animationClock.play();
  });

  animationClock.on('pause', () => {
    const compId = getCompId();
    import('../renderer/audio/audioContext').then(m => m.suspendAudio());
    const renderer = (window as any).__renderer;
    if (renderer?.renderLoop?.isBlitMode) {
      renderer.renderLoop.stopBlitPlayback();
      renderer.renderLoop.onBlitFrame = null;
      renderer.renderLoop.onBlitEnd = null;
      frameCache.hideOverlay();
    } else {
      animationClock.pause();
    }
    if (compId) useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
    useTimelineStore.getState().setPlaybackState('paused');
    usePreviewResolutionStore.getState().setPlaybackActive(false);
    if (renderer) {
      renderer.pauseAllVideos?.();
      renderer.pauseAllAudio?.();
      if (renderer.propertyBinder?.isActive) {
        if (compId) renderer.propertyBinder.flushOverridesToStore(compId);
        renderer.propertyBinder.setActive(false);
        renderer.layerSync.restoreFromOverrides();
        renderer.layerSync.setRuntimeOverridesActive(false);
      }
      renderer.sceneManager.compBounds.show();
      renderer.sceneManager.layerGroup.visible = true;
      renderer.renderLoop.requestRender();
    }
  });

  animationClock.on('stop', () => {
    const compId = getCompId();
    import('../renderer/audio/audioContext').then(m => m.suspendAudio());
    const renderer = (window as any).__renderer;
    if (renderer?.renderLoop?.isBlitMode) {
      renderer.renderLoop.stopBlitPlayback();
      renderer.renderLoop.onBlitFrame = null;
      renderer.renderLoop.onBlitEnd = null;
      frameCache.hideOverlay();
    } else {
      animationClock.stop();
    }
    if (compId) useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
    useTimelineStore.getState().setPlaybackState('stopped');
    usePreviewResolutionStore.getState().setPlaybackActive(false);
    if (renderer) {
      renderer.pauseAllVideos?.();
      renderer.pauseAllAudio?.();
      if (renderer.propertyBinder?.isActive) {
        if (compId) renderer.propertyBinder.flushOverridesToStore(compId);
        renderer.propertyBinder.setActive(false);
        renderer.layerSync.restoreFromOverrides();
        renderer.layerSync.setRuntimeOverridesActive(false);
      }
      renderer.sceneManager.compBounds.show();
      renderer.sceneManager.layerGroup.visible = true;
      renderer.renderLoop.requestRender();
    }
  });
}

document.addEventListener('playback:prevKeyframe', () => {
  const cs = useCompositionStore.getState();
  const c = cs.activeCompositionId ? cs.compositions.find((x) => x.id === cs.activeCompositionId) : null;
  if (!c) return;
  import('../state/selectionStore').then(({ useSelectionStore }) => {
    import('../state/keyframeStore').then(({ useKeyframeStore }) => {
      const ids = useSelectionStore.getState().getSelectedIds();
      const eng = useKeyframeStore.getState().engine;
      let all: number[] = [];
      const src = ids.length > 0 ? ids : c.layers.map((l) => l.id);
      for (const id of src) all = all.concat(eng.getAllKeyframesForLayer(id).map((k) => k.time));
      const prev = [...all].sort((a, b) => a - b).reverse().find((t) => t < animationClock.currentFrame);
      if (prev !== undefined) animationClock.seekToFrame(prev);
    });
  });
});

document.addEventListener('playback:nextKeyframe', () => {
  const cs = useCompositionStore.getState();
  const c = cs.activeCompositionId ? cs.compositions.find((x) => x.id === cs.activeCompositionId) : null;
  if (!c) return;
  import('../state/selectionStore').then(({ useSelectionStore }) => {
    import('../state/keyframeStore').then(({ useKeyframeStore }) => {
      const ids = useSelectionStore.getState().getSelectedIds();
      const eng = useKeyframeStore.getState().engine;
      let all: number[] = [];
      const src = ids.length > 0 ? ids : c.layers.map((l) => l.id);
      for (const id of src) all = all.concat(eng.getAllKeyframesForLayer(id).map((k) => k.time));
      const next = all.sort((a, b) => a - b).find((t) => t > animationClock.currentFrame);
      if (next !== undefined) animationClock.seekToFrame(next);
    });
  });
});

ensurePlaybackWired();

export const PlaybackController: React.FC = () => {
  const activeCompId = useCompositionStore(s => s.activeCompositionId);
  const comp = useCompositionStore(s =>
    s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null : null,
  );
  const loop = useTimelineStore(s => s.loop);
  const setPlaybackState = useTimelineStore(s => s.setPlaybackState);
  const isBuilding = useRamPreviewStore(s => s.isBuilding);
  const buildProgress = useRamPreviewStore(s => s.progress);
  const startBuild = useRamPreviewStore(s => s.startBuild);
  const stopBuild = useRamPreviewStore(s => s.stopBuild);

  // ── Sync clock to active composition ──
  React.useEffect(() => {
    if (!comp) return;
    const totalFrames = Math.floor(comp.duration * comp.fps);
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');
    const workAreaEnabled = !!comp.workAreaEnabled;
    animationClock.setUseWorkArea(workAreaEnabled);
    if (workAreaEnabled) {
      const wsFrame = Math.floor((comp.workAreaStart ?? 0) * comp.fps);
      const weFrame = Math.floor((comp.workAreaEnd ?? comp.duration) * comp.fps);
      animationClock.setWorkArea(wsFrame, weFrame);
    }
  }, [
    comp?.fps, comp?.duration, loop,
    comp?.workAreaEnabled, comp?.workAreaStart, comp?.workAreaEnd,
  ]);

  // ── Refresh RAM preview cache-bar periodically ──
  React.useEffect(() => {
    if (!activeCompId) return;
    const interval = setInterval(() => {
      if (!isBuilding) useRamPreviewStore.getState().refreshCachedFrames(activeCompId);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeCompId, isBuilding]);

  React.useEffect(() => {
    if (activeCompId) useRamPreviewStore.getState().refreshCachedFrames(activeCompId);
  }, [activeCompId]);

  // ── Master playback wiring — attached ONCE, tracks activeCompId ──
  React.useEffect(() => {
    if (!activeCompId) return;
    const compId = activeCompId;

    const onFrame = (ev: { frame: number; time: number }) => {
      const isPlaying = useTimelineStore.getState().playbackState === 'playing';
      const renderer = (window as any).__renderer;
      if (isPlaying) {
        useCompositionStore.getState().setCurrentTimeSilent(compId, ev.time);
        if (renderer && renderer.renderLoop.idlePaused) renderer.renderLoop.requestRender();
      } else {
        useCompositionStore.getState().setCurrentTime(compId, ev.time);
        if (renderer) renderer.renderLoop.requestRender();
      }
    };

    const onPlay = () => {
      import('../renderer/audio/audioContext').then(m => m.resumeAudio());
      setPlaybackState('playing');
      usePreviewResolutionStore.getState().setPlaybackActive(true);

      const cs = useCompositionStore.getState();
      const liveComp = cs.compositions.find(c => c.id === compId);
      const renderer = (window as any).__renderer;

      if (renderer?.propertyBinder) renderer.propertyBinder.setActive(true);

      if (liveComp && renderer?.renderLoop) {
        const { start, end } = getWorkAreaFrames(liveComp);
        const doBlit = canBlitPlay(liveComp);

        if (doBlit) {
          const fps = liveComp.fps;
          let blitFrame = Math.floor(liveComp.currentTime * fps);
          if (blitFrame < start) blitFrame = start;
          if (blitFrame >= end)  blitFrame = start;

          renderer.renderLoop.startBlitPlayback(
            blitFrame, end, fps, loop,
            (frame: number) => {
              const imageData = frameCache.getFrameSync(liveComp, frame);
              if (!imageData) return false;
              frameCache.blitToCanvas(imageData, renderer.renderer.domElement);
              useCompositionStore.getState().setCurrentTimeSilent(compId, frame / fps);
              return true;
            },
          );

          renderer.renderLoop.onBlitFrame = (frame: number) => {
            animationClock.seekToFrame(frame);
          };
          renderer.renderLoop.onBlitEnd = () => {
            useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
            setPlaybackState('stopped');
            usePreviewResolutionStore.getState().setPlaybackActive(false);
            frameCache.hideOverlay();
            renderer.renderLoop.requestRender();
          };
          return;
        }
      }

      animationClock.play();
    };

    const onPause = () => {
      import('../renderer/audio/audioContext').then(m => m.suspendAudio());
      const renderer = (window as any).__renderer;

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
      import('../renderer/audio/audioContext').then(m => m.suspendAudio());
      const renderer = (window as any).__renderer;

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

    const onPrevKf = () => {
      const cs = useCompositionStore.getState();
      const c = cs.compositions.find(x => x.id === compId);
      if (!c) return;
      import('../state/selectionStore').then(({ useSelectionStore }) => {
        import('../state/keyframeStore').then(({ useKeyframeStore }) => {
          const ids = useSelectionStore.getState().getSelectedIds();
          const eng = useKeyframeStore.getState().engine;
          let all: number[] = [];
          const src = ids.length > 0 ? ids : c.layers.map(l => l.id);
          for (const id of src)
            all = all.concat(eng.getAllKeyframesForLayer(id).map(k => k.time));
          const prev = [...all].sort((a, b) => a - b).reverse().find(t => t < animationClock.currentFrame);
          if (prev !== undefined) animationClock.seekToFrame(prev);
        });
      });
    };

    const onNextKf = () => {
      const cs = useCompositionStore.getState();
      const c = cs.compositions.find(x => x.id === compId);
      if (!c) return;
      import('../state/selectionStore').then(({ useSelectionStore }) => {
        import('../state/keyframeStore').then(({ useKeyframeStore }) => {
          const ids = useSelectionStore.getState().getSelectedIds();
          const eng = useKeyframeStore.getState().engine;
          let all: number[] = [];
          const src = ids.length > 0 ? ids : c.layers.map(l => l.id);
          for (const id of src)
            all = all.concat(eng.getAllKeyframesForLayer(id).map(k => k.time));
          const next = all.sort((a, b) => a - b).find(t => t > animationClock.currentFrame);
          if (next !== undefined) animationClock.seekToFrame(next);
        });
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isNumpad0    = e.code === 'Numpad0';
      const isShiftSpace = e.shiftKey && e.code === 'Space';
      if (isNumpad0 || isShiftSpace) {
        e.preventDefault();
        const building = useRamPreviewStore.getState().isBuilding;
        if (building) {
          useRamPreviewStore.getState().stopBuild();
        } else {
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

      if (e.code === 'Space' && !e.shiftKey) {
        e.preventDefault();
        const renderer = (window as any).__renderer;
        const playback = useTimelineStore.getState().playbackState;

        if (playback === 'playing') {
          if (renderer?.renderLoop?.isBlitMode) {
            renderer.renderLoop.stopBlitPlayback();
            renderer.renderLoop.onBlitFrame = null;
            renderer.renderLoop.onBlitEnd   = null;
            frameCache.hideOverlay();
            useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
            setPlaybackState('paused');
            usePreviewResolutionStore.getState().setPlaybackActive(false);
            renderer.renderLoop.requestRender();
          } else {
            animationClock.pause();
          }
        } else {
          animationClock.play();
        }
        return;
      }
    };

    animationClock.on('frame-changed', onFrame);
    animationClock.on('play', onPlay);
    animationClock.on('pause', onPause);
    animationClock.on('stop', onStop);
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
  }, [activeCompId, setPlaybackState, loop]);

  // ── Expose globals for TimelineHeader RAM Preview button ────
  React.useEffect(() => {
    if (!activeCompId) return;
    (window as any).__ramPreviewBuilding = isBuilding;
    (window as any).__ramPreviewProgress = buildProgress;
    (window as any).__ramPreviewStart    = () => startBuild(activeCompId);
    (window as any).__ramPreviewStop     = stopBuild;
    document.dispatchEvent(new CustomEvent('rampreview:statechange', {
      detail: { isBuilding, progress: buildProgress },
    }));
  }, [isBuilding, buildProgress, activeCompId, startBuild, stopBuild]);

  return null;
};