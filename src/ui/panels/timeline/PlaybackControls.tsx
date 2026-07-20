import React from 'react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { AnimationClock } from '../../../animation/AnimationClock';
import type { Composition } from '../../../types/composition';

interface Props {
  comp: Composition;
  totalFrames: number;
  currentFrame: number;
}

export const animationClock = new AnimationClock();

export const PlaybackControls: React.FC<Props> = ({
  comp,
  totalFrames,
}) => {
  const loop = useTimelineStore((s) => s.loop);
  const setPlaybackState = useTimelineStore((s) => s.setPlaybackState);

  React.useEffect(() => {
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');

    const onFrame = (ev: { frame: number }) => {
      console.log('[onFrame] frame=', ev.frame, 'compId=', comp.id, 'newTime=', ev.frame / comp.fps);
      useCompositionStore.getState().setCurrentTime(comp.id, ev.frame / comp.fps);
      const afterUpdate = useCompositionStore.getState().compositions.find(c => c.id === comp.id);
      console.log('[onFrame] after setCurrentTime, store currentTime=', afterUpdate?.currentTime);
      const renderer = (window as any).__renderer;
      if (renderer) renderer.renderLoop.requestRender();
    };

    const onPlay = () => {
      setPlaybackState('playing');
      const renderer = (window as any).__renderer;
      if (renderer?.propertyBinder) renderer.propertyBinder.setActive(true);

      // Cancel any ongoing cache build — don't prefetch during live playback.
      const builder = (window as any).__ramPreviewBuilder;
      if (builder?.isBuilding) builder.cancel();
    };

    const onPause = () => {
      setPlaybackState('paused');
      const renderer = (window as any).__renderer;
      if (renderer) {
        if (renderer.pauseAllVideos) renderer.pauseAllVideos();
        if (renderer.pauseAllAudio) renderer.pauseAllAudio();
        if (renderer.propertyBinder?.isActive) {
          renderer.propertyBinder.setActive(false);
          renderer.layerSync.restoreFromOverrides();
          renderer.layerSync.setRuntimeOverridesActive(false);
        }
        renderer.sceneManager.compBounds.show();
        renderer.sceneManager.layerGroup.visible = true;
        renderer.renderLoop.requestRender();
      }

      // After pausing, trigger a single background prefetch pass
      if (useTimelineStore.getState().autoCache) {
        const builder = (window as any).__ramPreviewBuilder;
        if (builder && !builder.isBuilding) {
          builder.startBackgroundPrefetch(
            comp.id,
            animationClock.currentFrame,
            120,
          );
        }
      }
    };

    const onStop = () => {
      setPlaybackState('stopped');
      const renderer = (window as any).__renderer;
      if (renderer) {
        if (renderer.pauseAllVideos) renderer.pauseAllVideos();
        if (renderer.pauseAllAudio) renderer.pauseAllAudio();
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
            all = all.concat(
              eng.getAllKeyframesForLayer(id).map((k) => k.time),
            );
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
            all = all.concat(
              eng.getAllKeyframesForLayer(id).map((k) => k.time),
            );
          const next = all
            .sort((a, b) => a - b)
            .find((t) => t > animationClock.currentFrame);
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
  }, [comp.id, comp.fps, totalFrames, loop, setPlaybackState]);

  return null;
};