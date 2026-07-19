import React from 'react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { AnimationClock } from '../../../animation/AnimationClock';
import type { Composition } from '../../../types/composition';

interface Props { comp: Composition; totalFrames: number; currentFrame: number; }

export const animationClock = new AnimationClock();

export const PlaybackControls: React.FC<Props> = ({ comp, totalFrames }) => {
  const loop = useTimelineStore(s => s.loop);
  const setPlaybackState = useTimelineStore(s => s.setPlaybackState);

  React.useEffect(() => {
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');

    const onFrame = (ev: { frame: number }) => {
      useCompositionStore.getState().setCurrentTime(comp.id, ev.frame / comp.fps);
      const renderer = (window as any).__renderer;
      if (renderer) renderer.renderLoop.requestRender();
    };

    let autoCacheInterval: ReturnType<typeof setInterval> | null = null;
    const _stopAutoCache = () => {
      if (autoCacheInterval !== null) { clearInterval(autoCacheInterval); autoCacheInterval = null; }
    };
    const _triggerPrefetch = (cid: string) => {
      // Check autoCache flag on every tick — toggling it off while
      // playing stops the interval and prevents further prefetches.
      if (!useTimelineStore.getState().autoCache) {
        _stopAutoCache();
        // Also cancel any ongoing background prefetch build loop
        // (it runs asynchronously via setTimeout and won't stop on its own)
        const builder = (window as any).__ramPreviewBuilder;
        if (builder && builder.isBuilding) builder.cancel();
        return;
      }
      const builder = (window as any).__ramPreviewBuilder;
      if (!builder || builder.isBuilding) return;
      builder.startBackgroundPrefetch(cid, animationClock.currentFrame, 90);
    };
    const _startAutoCache = (cid: string) => {
      _stopAutoCache();
      _triggerPrefetch(cid);
      autoCacheInterval = setInterval(() => _triggerPrefetch(cid), 2000);
    };

    const onPlay = () => {
      setPlaybackState('playing');
      const renderer = (window as any).__renderer;
      if (renderer?.propertyBinder) renderer.propertyBinder.setActive(true);
      if (useTimelineStore.getState().autoCache) _startAutoCache(comp.id);
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

    const onRAMPreviewComplete = () => { animationClock.stop(); };

    document.addEventListener('playback:prevKeyframe', onPrevKf);
    document.addEventListener('playback:nextKeyframe', onNextKf);
    document.addEventListener('rampreview:complete', onRAMPreviewComplete);

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