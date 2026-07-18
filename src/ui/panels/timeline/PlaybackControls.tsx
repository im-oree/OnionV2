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

    const cleanups: Array<() => void> = [];

    import('../../../animation/PropertyBinder').then(({ PropertyBinder }) => {
      import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
        import('../../../state/uiStore').then(({ useUIStore }) => {
          const binder = new PropertyBinder(useKeyframeStore.getState().engine);
          const onFrame = (ev: { frame: number }) => {
            binder.evaluateFrame(comp.id, ev.frame);
            const req = useUIStore.getState().requestRendererRender;
            if (req) req();
          };
          animationClock.on('frame-changed', onFrame);
          cleanups.push(() => animationClock.off('frame-changed', onFrame));
        });
      });
    });

    const onFrame = (ev: { frame: number }) => {
      useCompositionStore.getState().setCurrentTime(comp.id, ev.frame / comp.fps);
    };
    const onPlay = () => setPlaybackState('playing');
    const onPause = () => setPlaybackState('paused');
    const onStop = () => setPlaybackState('stopped');
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
    document.addEventListener('playback:nextKeyframe', onNextKf);

    return () => {
      animationClock.off('frame-changed', onFrame);
      animationClock.off('play', onPlay);
      animationClock.off('pause', onPause);
      animationClock.off('stop', onStop);
      document.removeEventListener('playback:prevKeyframe', onPrevKf);
      document.removeEventListener('playback:nextKeyframe', onNextKf);
      cleanups.forEach(fn => fn());
    };
  }, [comp.id, comp.fps, totalFrames, loop, setPlaybackState]);

  return null;
};