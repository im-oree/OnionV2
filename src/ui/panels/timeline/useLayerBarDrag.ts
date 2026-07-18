import { useCallback, useRef } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { snapFrame, buildSnapTargets } from './snapping';
import { animationClock } from './PlaybackControls';
import type { Layer } from '../../../types/layer';

type DragMode = 'move' | 'trimStart' | 'trimEnd';

export function useLayerBarDrag(
  layer: Layer,
  compId: string,
  zoom: number,
  totalFrames: number,
): {
  onMouseDown: (mode: DragMode) => (e: React.MouseEvent) => void;
} {
  const dragState = useRef<{
    mode: DragMode;
    startX: number;
    startFrame: number;
    endFrame: number;
  } | null>(null);

  const onMouseDown = useCallback((mode: DragMode) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    dragState.current = {
      mode,
      startX: e.clientX,
      startFrame: layer.startFrame,
      endFrame: layer.endFrame,
    };

    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const buildTargets = () => buildSnapTargets({
      currentFrame: animationClock.currentFrame,
      totalFrames,
      workAreaStart: comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : undefined,
      workAreaEnd: comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : undefined,
      layers: comp.layers,
      keyframes: [],
      excludeId: layer.id,
    });

    const onMove = (ev: MouseEvent) => {
      const st = dragState.current;
      if (!st) return;
      const dxPx = ev.clientX - st.startX;
      const dxFrames = Math.round(dxPx / zoom);

      const snappingOn = useTimelineStore.getState().snapping;
      const useSnap = ev.ctrlKey ? !snappingOn : snappingOn;

      let newStart = st.startFrame;
      let newEnd = st.endFrame;

      if (st.mode === 'move') {
        newStart = st.startFrame + dxFrames;
        newEnd = st.endFrame + dxFrames;
      } else if (st.mode === 'trimStart') {
        newStart = Math.min(st.endFrame - 1, st.startFrame + dxFrames);
      } else if (st.mode === 'trimEnd') {
        newEnd = Math.max(st.startFrame + 1, st.endFrame + dxFrames);
      }

      if (useSnap) {
        const targets = buildTargets();
        const threshold = Math.max(1, 8 / zoom);
        if (st.mode === 'move') {
          const snapS = snapFrame(newStart, targets, threshold);
          if (snapS.snappedTo) {
            const shift = snapS.frame - newStart;
            newStart += shift; newEnd += shift;
          } else {
            const snapE = snapFrame(newEnd, targets, threshold);
            if (snapE.snappedTo) {
              const shift = snapE.frame - newEnd;
              newStart += shift; newEnd += shift;
            }
          }
        } else if (st.mode === 'trimStart') {
          newStart = snapFrame(newStart, targets, threshold).frame;
        } else {
          newEnd = snapFrame(newEnd, targets, threshold).frame;
        }
      }

      newStart = Math.max(0, newStart);
      newEnd = Math.min(totalFrames, newEnd);
      if (newEnd <= newStart) newEnd = newStart + 1;

      useCompositionStore.getState().updateLayer(compId, layer.id, {
        startFrame: newStart, endFrame: newEnd,
      });
    };

    const onUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [layer.id, layer.startFrame, layer.endFrame, compId, zoom, totalFrames]);

  return { onMouseDown };
}