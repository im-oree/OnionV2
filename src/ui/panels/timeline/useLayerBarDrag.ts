import { useCallback, useRef } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { snapFrame, buildSnapTargets } from './snapping';
import { animationClock } from './PlaybackControls';
import type { Layer } from '../../../types/layer';

type DragMode = 'move' | 'trimStart' | 'trimEnd';

interface LayerSnapshot {
  startFrame: number;
  endFrame: number;
}

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
    /** Snapshot of ALL layers being dragged (selected + the dragged one) */
    snapshots: Map<string, LayerSnapshot>;
  } | null>(null);

  const onMouseDown = useCallback((mode: DragMode) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Collect all selected layer IDs — if the dragged layer is already selected,
    // drag all selected layers together; otherwise just drag the single layer.
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    const dragIds = selectedIds.includes(layer.id)
      ? selectedIds
      : [layer.id];

    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    // Build start-frame snapshots for every layer being dragged
    const snapshots = new Map<string, LayerSnapshot>();
    for (const id of dragIds) {
      const l = comp.layers.find(ll => ll.id === id);
      if (l) snapshots.set(id, { startFrame: l.startFrame, endFrame: l.endFrame });
    }
    // Ensure the primary layer is always present
    if (!snapshots.has(layer.id)) {
      snapshots.set(layer.id, { startFrame: layer.startFrame, endFrame: layer.endFrame });
    }

    dragState.current = { mode, startX: e.clientX, snapshots };

    const buildTargets = () => buildSnapTargets({
      currentFrame: animationClock.currentFrame,
      totalFrames,
      workAreaStart: comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : undefined,
      workAreaEnd: comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : undefined,
      layers: comp.layers,
      keyframes: [],
      // Exclude all dragged layers from snap targets to avoid intra-selection snapping
      excludeId: layer.id,
    });

    const onMove = (ev: MouseEvent) => {
      const st = dragState.current;
      if (!st) return;
      const dxPx = ev.clientX - st.startX;
      const dxFrames = Math.round(dxPx / zoom);

      const snappingOn = useTimelineStore.getState().snapping;
      const useSnap = ev.ctrlKey ? !snappingOn : snappingOn;

      // Primary layer new bounds (used for snapping)
      const primary = st.snapshots.get(layer.id)!;
      let primaryStart = primary.startFrame;
      let primaryEnd = primary.endFrame;

      if (st.mode === 'move') {
        primaryStart = primary.startFrame + dxFrames;
        primaryEnd = primary.endFrame + dxFrames;
      } else if (st.mode === 'trimStart') {
        primaryStart = Math.min(primary.endFrame - 1, primary.startFrame + dxFrames);
      } else if (st.mode === 'trimEnd') {
        primaryEnd = Math.max(primary.startFrame + 1, primary.endFrame + dxFrames);
      }

      if (useSnap) {
        const targets = buildTargets();
        const threshold = Math.max(1, 8 / zoom);
        if (st.mode === 'move') {
          const snapS = snapFrame(primaryStart, targets, threshold);
          if (snapS.snappedTo) {
            const shift = snapS.frame - primaryStart;
            primaryStart += shift; primaryEnd += shift;
          } else {
            const snapE = snapFrame(primaryEnd, targets, threshold);
            if (snapE.snappedTo) {
              const shift = snapE.frame - primaryEnd;
              primaryStart += shift; primaryEnd += shift;
            }
          }
        } else if (st.mode === 'trimStart') {
          primaryStart = snapFrame(primaryStart, targets, threshold).frame;
        } else {
          primaryEnd = snapFrame(primaryEnd, targets, threshold).frame;
        }
      }

      // Clamp
      primaryStart = Math.max(0, primaryStart);
      primaryEnd = Math.min(totalFrames, primaryEnd);
      if (primaryEnd <= primaryStart) primaryEnd = primaryStart + 1;

      // Compute the delta relative to the primary layer's original snapshot
      const deltaStart = primaryStart - primary.startFrame;
      const deltaEnd = primaryEnd - primary.endFrame;

      // Apply delta to ALL selected layers
      const store = useCompositionStore.getState();
      for (const [id, snap] of st.snapshots) {
        let ns: number, ne: number;
        if (st.mode === 'move') {
          ns = snap.startFrame + deltaStart;
          ne = snap.endFrame + deltaStart;
        } else if (st.mode === 'trimStart') {
          ns = snap.startFrame + deltaStart;
          ne = snap.endFrame;
        } else {
          ns = snap.startFrame;
          ne = snap.endFrame + deltaEnd;
        }
        ns = Math.max(0, ns);
        ne = Math.min(totalFrames, ne);
        if (ne <= ns) ne = ns + 1;
        store.updateLayer(compId, id, { startFrame: ns, endFrame: ne });
      }
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