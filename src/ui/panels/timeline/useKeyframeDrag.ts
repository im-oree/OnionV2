import { useCallback, useRef } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../state/historyStore';
import { snapFrame, buildSnapTargets } from './snapping';
import { animationClock } from './PlaybackControls';

export function useKeyframeDrag(zoom: number, totalFrames: number) {
  const state = useRef<{
    startX: number;
    dragSet: { id: string; startTime: number }[];
  } | null>(null);

  const onDown = useCallback((kfId: string, startTime: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Ensure the clicked keyframe is in the selection
    const store = useKeyframeStore.getState();
    let selected = store.selectedKeyframeIds;
    if (!selected.has(kfId)) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) store.toggleKeyframeSelection(kfId);
      else store.selectKeyframe(kfId, false);
      selected = useKeyframeStore.getState().selectedKeyframeIds;
    }

    // Build drag snapshot from all selected keyframes
    const engine: any = store.engine;
    const dragSet: { id: string; startTime: number }[] = [];
    for (const [, propMap] of engine._data as Map<string, Map<string, any[]>>) {
      for (const [, arr] of propMap) {
        for (const k of arr) if (selected.has(k.id)) dragSet.push({ id: k.id, startTime: k.time });
      }
    }
    state.current = { startX: e.clientX, dragSet };

    // Capture "before" state for undo — debounced so only one snapshot is created per drag
    debouncedCapture('Move Keyframes');

    // If it was just a click (no drag), keep going but only mutate on move

    const compState = useCompositionStore.getState();
    const comp = compState.activeCompositionId
      ? compState.compositions.find(c => c.id === compState.activeCompositionId)
      : null;

    let moved = false;

    const onMove = (ev: MouseEvent) => {
      const st = state.current; if (!st) return;
      const dxPx = ev.clientX - st.startX;
      if (!moved && Math.abs(dxPx) < 2) return;
      moved = true;
      const dxFr = Math.round(dxPx / zoom);
      const snapping = useTimelineStore.getState().snapping;
      const useSnap = ev.ctrlKey ? !snapping : snapping;
      // Build snap targets once per move (fine for now)
      let targets: any[] | null = null;
      if (useSnap && comp) {
        targets = buildSnapTargets({
          currentFrame: animationClock.currentFrame,
          totalFrames,
          workAreaStart: comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : undefined,
          workAreaEnd: comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : undefined,
          layers: comp.layers,
          keyframes: [],
        });
      }
      const engineNow: any = useKeyframeStore.getState().engine;
      for (const item of st.dragSet) {
        let newTime = item.startTime + dxFr;
        newTime = Math.max(0, Math.min(totalFrames, newTime));
        if (useSnap && targets) {
          newTime = snapFrame(newTime, targets, Math.max(1, 8 / zoom)).frame;
        }
        engineNow.updateKeyframe(item.id, { time: newTime });
      }
      useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
    };
    const onUp = () => {
      state.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) flushDebouncedSnapshot();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [zoom, totalFrames]);

  return { onDown };
}