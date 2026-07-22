import React from 'react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { usePreviewResolutionStore } from '../../../state/previewResolutionStore';
import { AnimationClock } from '../../../animation/AnimationClock';
import type { Composition } from '../../../types/composition';

interface Props {
  comp: Composition;
  totalFrames: number;
  currentFrame: number;
}

export const animationClock = new AnimationClock();

export const PlaybackControls: React.FC<Props> = ({ comp, totalFrames }) => {
  const loop = useTimelineStore((s) => s.loop);
  const setPlaybackState = useTimelineStore((s) => s.setPlaybackState);

  React.useEffect(() => {
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');
  }, [comp.fps, totalFrames, loop]);

  React.useEffect(() => {
    const compId = comp.id;

    const onFrame = (ev: { frame: number; time: number }) => {
      const isPlaying = useTimelineStore.getState().playbackState === 'playing';
      if (isPlaying) {
        // Silent write — no Zustand subscribers fire.
        // Renderer reads currentTime via getState() each frame anyway.
        useCompositionStore.getState().setCurrentTimeSilent(compId, ev.time);
      } else {
        // Seek / scrub / step — full reactive update so timeline UI moves.
        useCompositionStore.getState().setCurrentTime(compId, ev.time);
      }
      const renderer = (window as any).__renderer;
      if (renderer) renderer.renderLoop.requestRender();
    };

    const onPlay = () => {
      setPlaybackState('playing');
      usePreviewResolutionStore.getState().setPlaybackActive(true);
      const renderer = (window as any).__renderer;
      if (renderer?.propertyBinder) renderer.propertyBinder.setActive(true);
      const builder = (window as any).__ramPreviewBuilder;
      if (builder?.isBuilding) builder.cancel();
    };

    const onPause = () => {
      // Flush the silent time back into the reactive store so UI updates once.
      useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
      setPlaybackState('paused');
      usePreviewResolutionStore.getState().setPlaybackActive(false);
      const renderer = (window as any).__renderer;
      if (renderer) {
        renderer.pauseAllVideos?.();
        renderer.pauseAllAudio?.();
        if (renderer.propertyBinder?.isActive) {
          // Flush transform3D + data + camera runtime overrides back to store
          // so the properties panel + camera panel reflect the paused frame.
          renderer.propertyBinder.flushOverridesToStore(compId);
          renderer.propertyBinder.setActive(false);
          renderer.layerSync.restoreFromOverrides();
          renderer.layerSync.setRuntimeOverridesActive(false);
        }
        renderer.sceneManager.compBounds.show();
        renderer.sceneManager.layerGroup.visible = true;
        renderer.renderLoop.requestRender();
      }
      if (useTimelineStore.getState().autoCache) {
        const builder = (window as any).__ramPreviewBuilder;
        if (builder && !builder.isBuilding) {
          builder.startBackgroundPrefetch(compId, animationClock.currentFrame, 120);
        }
      }
    };

    const onStop = () => {
      // Flush the silent time back into the reactive store so UI updates once.
      useCompositionStore.getState().setCurrentTime(compId, animationClock.currentTime);
      setPlaybackState('stopped');
      usePreviewResolutionStore.getState().setPlaybackActive(false);
      const renderer = (window as any).__renderer;
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
          const prev = [...all].sort((a, b) => a - b).reverse().find((t) => t < animationClock.currentFrame);
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
          const next = all.sort((a, b) => a - b).find((t) => t > animationClock.currentFrame);
          if (next !== undefined) animationClock.seekToFrame(next);
        });
      });
    };

    document.addEventListener('playback:prevKeyframe', onPrevKf);
    document.addEventListener('playback:nextKeyframe', onNextKf);

    return () => {
      animationClock.off('frame-changed', onFrame);
      animationClock.off('play', onPlay);
      animationClock.off('pause', onPause);
      animationClock.off('stop', onStop);
      document.removeEventListener('playback:prevKeyframe', onPrevKf);
      document.removeEventListener('playback:nextKeyframe', onNextKf);
    };
  }, [comp.id, setPlaybackState]);

  return null;
};