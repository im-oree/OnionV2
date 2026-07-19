import React from 'react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { AnimationClock } from '../../../animation/AnimationClock';
import type { Composition } from '../../../types/composition';

interface Props { comp: Composition; totalFrames: number; currentFrame: number; }

/** Global clock singleton */
export const animationClock = new AnimationClock();

/** Handles wiring the clock to comp/store — no visible UI (header owns transport). */
export const PlaybackControls: React.FC<Props> = ({ comp, totalFrames }) => {
  const loop = useTimelineStore(s => s.loop);
  const setPlaybackState = useTimelineStore(s => s.setPlaybackState);

  React.useEffect(() => {
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');

    const onFrame = (ev: { frame: number }) => {
      useCompositionStore.getState().setCurrentTime(comp.id, ev.frame / comp.fps);
    };
    // Auto-cache interval re-trigger (only when autoCache toggle is ON)
    let autoCacheInterval: ReturnType<typeof setInterval> | null = null;
    const _startAutoCache = (cid: string) => {
      _stopAutoCache();
      _triggerPrefetch(cid);
      autoCacheInterval = setInterval(() => _triggerPrefetch(cid), 2000);
    };
    const _stopAutoCache = () => {
      if (autoCacheInterval !== null) {
        clearInterval(autoCacheInterval);
        autoCacheInterval = null;
      }
    };
    const _triggerPrefetch = (cid: string) => {
      const builder = (window as any).__ramPreviewBuilder;
      if (!builder) return;
      // Don't interrupt a manual preview build (background prefetch will auto-pause during transforms)
      if (builder.isBuilding) return;
      const frame = animationClock.currentFrame;
      builder.startBackgroundPrefetch(cid, frame, 90);
    };

    const onPlay = () => {
      setPlaybackState('playing');
      // M11: Activate property binder for runtime animation overrides
      const renderer = (window as any).__renderer;
      if (renderer?.propertyBinder) {
        renderer.propertyBinder.setActive(true);
      }
      if (useTimelineStore.getState().autoCache) {
        _startAutoCache(comp.id);
      }
    };
    const onPause = () => {
      setPlaybackState('paused');
      _stopAutoCache();
      const renderer = (window as any).__renderer;
      if (renderer) {
        if (renderer.propertyBinder?.isActive) {
          renderer.propertyBinder.setActive(false);
          renderer.layerSync.restoreFromOverrides();
          renderer.layerSync.setRuntimeOverridesActive(false);
        }
        // Ensure 3D scene is visible after playback stops
        renderer.sceneManager.compBounds.show();
        renderer.sceneManager.layerGroup.visible = true;
        renderer.renderLoop.requestRender();
      }
    };
    const onStop = () => {
      setPlaybackState('stopped');
      _stopAutoCache();
      const renderer = (window as any).__renderer;
      if (renderer) {
        if (renderer.propertyBinder?.isActive) {
          renderer.propertyBinder.setActive(false);
          renderer.layerSync.restoreFromOverrides();
          renderer.layerSync.setRuntimeOverridesActive(false);
        }
        // Ensure 3D scene is visible after playback stops
        renderer.sceneManager.compBounds.show();
        renderer.sceneManager.layerGroup.visible = true;
        renderer.renderLoop.requestRender();
      }
    };
    animationClock.on('frame-changed', onFrame);
    animationClock.on('play', onPlay);
    animationClock.on('pause', onPause);
    animationClock.on('stop', onStop);

    // Wire header prev/next keyframe events
    const onPrevKf = () => {
      const cs = useCompositionStore.getState();
      const c = cs.activeCompositionId ? cs.compositions.find(x => x.id === cs.activeCompositionId) : null;
      if (!c) return;
      import('../../../state/selectionStore').then(({ useSelectionStore }) => {
        import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
          const ids = useSelectionStore.getState().getSelectedIds();
          const eng = useKeyframeStore.getState().engine;
          let all: number[] = [];
          const src = ids.length > 0 ? ids : c.layers.map(l => l.id);
          for (const id of src) all = all.concat(eng.getAllKeyframesForLayer(id).map(k => k.time));
          const prev = [...all].sort((a, b) => a - b).reverse().find(t => t < animationClock.currentFrame);
          if (prev !== undefined) animationClock.seekToFrame(prev);
        });
      });
    };
    const onNextKf = () => {
      const cs = useCompositionStore.getState();
      const c = cs.activeCompositionId ? cs.compositions.find(x => x.id === cs.activeCompositionId) : null;
      if (!c) return;
      import('../../../state/selectionStore').then(({ useSelectionStore }) => {
        import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
          const ids = useSelectionStore.getState().getSelectedIds();
          const eng = useKeyframeStore.getState().engine;
          let all: number[] = [];
          const src = ids.length > 0 ? ids : c.layers.map(l => l.id);
          for (const id of src) all = all.concat(eng.getAllKeyframesForLayer(id).map(k => k.time));
          const next = all.sort((a, b) => a - b).find(t => t > animationClock.currentFrame);
          if (next !== undefined) animationClock.seekToFrame(next);
        });
      });
    };
    document.addEventListener('playback:prevKeyframe', onPrevKf);
    // RAM preview complete — just notify, don't auto-play
    const onRAMPreviewComplete = () => {
      // Stop playback if it was running, and seek to start
      animationClock.stop();
    };
    document.addEventListener('rampreview:complete', onRAMPreviewComplete);
    document.addEventListener('playback:nextKeyframe', onNextKf);

    return () => {
      _stopAutoCache();
      animationClock.off('frame-changed', onFrame);
      animationClock.off('play', onPlay);
      animationClock.off('pause', onPause);
      animationClock.off('stop', onStop);
      document.removeEventListener('rampreview:complete', onRAMPreviewComplete);
      document.removeEventListener('playback:prevKeyframe', onPrevKf);
      document.removeEventListener('playback:nextKeyframe', onNextKf);
    };
  }, [comp.id, comp.fps, totalFrames, loop, setPlaybackState]);

  return null;
};