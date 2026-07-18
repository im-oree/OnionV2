import { useCallback, useRef } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { snapFrame, buildSnapTargets } from './snapping';
import { animationClock } from './PlaybackControls';

export function useKeyframeDrag(zoom: number, totalFrames: number) {
  const state = useRef<{ kfId: string; startTime: number; startX: number } | null>(null);

  const onDown = useCallback((kfId: string, startTime: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    state.current = { kfId, startTime, startX: e.clientX };

    const compState = useCompositionStore.getState();
    const comp = compState.activeCompositionId
      ? compState.compositions.find(c => c.id === compState.activeCompositionId)
      : null;

    const onMove = (ev: MouseEvent) => {
      const st = state.current; if (!st) return;
      const dxPx = ev.clientX - st.startX;
      const dxFr = Math.round(dxPx / zoom);
      let newTime = Math.max(0, Math.min(totalFrames, st.startTime + dxFr));

      const snappingOn = useTimelineStore.getState().snapping;
      const useSnap = ev.ctrlKey ? !snappingOn : snappingOn;
      if (useSnap && comp) {
        const targets = buildSnapTargets({
          currentFrame: animationClock.currentFrame,
          totalFrames,
          workAreaStart: comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : undefined,
          workAreaEnd: comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : undefined,
          layers: comp.layers,
          keyframes: [],
        });
        newTime = snapFrame(newTime, targets, Math.max(1, 8 / zoom)).frame;
      }
      useKeyframeStore.getState().moveKeyframe(st.kfId, newTime);
    };
    const onUp = () => {
      state.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [zoom, totalFrames]);

  return { onDown };
}