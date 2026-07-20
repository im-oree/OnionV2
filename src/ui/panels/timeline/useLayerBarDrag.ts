import { useCallback, useRef } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../state/historyStore';
import { snapFrame, buildSnapTargets } from './snapping';
import { animationClock } from './PlaybackControls';
import type { Layer } from '../../../types/layer';

export type DragMode = 'move' | 'trimStart' | 'trimEnd' | 'rippleStart' | 'rippleEnd' | 'slip' | 'roll';

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
    snapshots: Map<string, LayerSnapshot>;
    adjacentId?: string;
    originalKeyframeTimes?: Map<string, Map<string, number>>;
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

    // For roll edit: find the adjacent layer
    let adjacentId: string | undefined;
    if (mode === 'roll') {
      const sorted = [...comp.layers].sort((a, b) => b.zIndex - a.zIndex);
      const layerIdx = sorted.findIndex(l => l.id === layer.id);
      if (layerIdx > 0) {
        const prev = sorted[layerIdx - 1];
        if (prev && Math.abs(prev.endFrame - layer.startFrame) < 2) adjacentId = prev.id;
      }
    }
    // Capture original keyframe times for all dragged layers (used in move mode)
    const originalKeyframeTimes = new Map<string, Map<string, number>>();
    for (const id of dragIds) {
      const kfs = useKeyframeStore.getState().engine.getAllKeyframesForLayer(id);
      if (kfs.length > 0) {
        const timesMap = new Map<string, number>();
        for (const kf of kfs) timesMap.set(kf.id, kf.time);
        originalKeyframeTimes.set(id, timesMap);
      }
    }

    // Capture "before" state for undo — debounced so only one snapshot is created per drag
    debouncedCapture('Move Layer');

    dragState.current = { mode, startX: e.clientX, snapshots, adjacentId, originalKeyframeTimes };

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

      switch (st.mode) {
        case 'move':
          primaryStart = primary.startFrame + dxFrames;
          primaryEnd = primary.endFrame + dxFrames;
          break;
        case 'trimStart':
        case 'rippleStart':
          primaryStart = Math.min(primary.endFrame - 1, primary.startFrame + dxFrames);
          break;
        case 'trimEnd':
        case 'rippleEnd':
          primaryEnd = Math.max(primary.startFrame + 1, primary.endFrame + dxFrames);
          break;
        case 'slip': break;
        case 'roll':
          primaryStart = Math.min(primary.endFrame - 1, primary.startFrame + dxFrames);
          primaryEnd = Math.max(primary.startFrame + 1, primary.endFrame + dxFrames);
          break;
      }

      if (useSnap && st.mode !== 'slip') {
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
        } else if (st.mode === 'trimStart' || st.mode === 'rippleStart') {
          primaryStart = snapFrame(primaryStart, targets, threshold).frame;
        } else if (st.mode === 'trimEnd' || st.mode === 'rippleEnd') {
          primaryEnd = snapFrame(primaryEnd, targets, threshold).frame;
        } else if (st.mode === 'roll') {
          primaryStart = snapFrame(primaryStart, targets, threshold).frame;
        }
      }

      // Clamp
      primaryStart = Math.max(0, primaryStart);
      primaryEnd = Math.min(totalFrames, primaryEnd);
      if (primaryEnd <= primaryStart) primaryEnd = primaryStart + 1;

      const deltaStart = primaryStart - primary.startFrame;
      const deltaEnd = primaryEnd - primary.endFrame;
      const store = useCompositionStore.getState();

      if (st.mode === 'slip') {
        for (const [id, snap] of st.snapshots) {
          const dur = snap.endFrame - snap.startFrame;
          let ns = snap.startFrame + dxFrames;
          if (ns < 0) ns = 0;
          if (ns + dur > totalFrames) ns = totalFrames - dur;
          store.updateLayer(compId, id, { startFrame: ns, endFrame: ns + dur }, true);  // skipHistory
        }
      } else if (st.mode === 'roll') {
        store.updateLayer(compId, layer.id, { startFrame: primaryStart, endFrame: primaryEnd }, true);  // skipHistory
        if (st.adjacentId) {
          const adjSnap = st.snapshots.get(st.adjacentId);
          const adjStart = adjSnap?.startFrame ?? 0;
          const adjEnd = Math.max(adjStart + 1, primaryStart);
          store.updateLayer(compId, st.adjacentId, { endFrame: adjEnd }, true);  // skipHistory
        }
      } else if (st.mode === 'rippleEnd') {
        const oldEnd = primary.endFrame;
        const rippleDelta = primaryEnd - oldEnd;
        store.updateLayer(compId, layer.id, { endFrame: primaryEnd }, true);  // skipHistory
        if (rippleDelta !== 0) {
          for (const l of comp.layers) {
            if (l.id === layer.id) continue;
            if (l.startFrame >= oldEnd) {
              store.updateLayer(compId, l.id, {
                startFrame: l.startFrame + rippleDelta,
                endFrame: l.endFrame + rippleDelta,
              }, true);  // skipHistory
            }
          }
        }
      } else if (st.mode === 'rippleStart') {
        const oldStart = primary.startFrame;
        const rippleDelta = primaryStart - oldStart;
        store.updateLayer(compId, layer.id, { startFrame: primaryStart }, true);  // skipHistory
        if (rippleDelta !== 0) {
          for (const l of comp.layers) {
            if (l.id === layer.id) continue;
            if (l.endFrame <= oldStart) {
              store.updateLayer(compId, l.id, {
                startFrame: l.startFrame + rippleDelta,
                endFrame: l.endFrame + rippleDelta,
              }, true);  // skipHistory
            }
          }
        }
      } else {
        for (const [id, snap] of st.snapshots) {
          let ns: number, ne: number;
          if (st.mode === 'move') { ns = snap.startFrame + deltaStart; ne = snap.endFrame + deltaStart; }
          else if (st.mode === 'trimStart') { ns = snap.startFrame + deltaStart; ne = snap.endFrame; }
          else { ns = snap.startFrame; ne = snap.endFrame + deltaEnd; }
          ns = Math.max(0, ns); ne = Math.min(totalFrames, ne);
          if (ne <= ns) ne = ns + 1;
          store.updateLayer(compId, id, { startFrame: ns, endFrame: ne }, true);  // skipHistory — undo captured at drag start
          // When moving a layer, also move all its keyframes by the same delta
          if (st.mode === 'move' && st.originalKeyframeTimes) {
            const kfStore = useKeyframeStore.getState();
            const origTimes = st.originalKeyframeTimes.get(id);
            if (origTimes && origTimes.size > 0) {
              for (const [kfId, origTime] of origTimes) {
                const newTime = Math.max(0, origTime + deltaStart);
                kfStore.engine.updateKeyframe(kfId, { time: newTime });
              }
              useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
            }
          }
        }
      }
    };

    const onUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Push the single "before" snapshot now that the drag is complete
      flushDebouncedSnapshot();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [layer.id, layer.startFrame, layer.endFrame, compId, zoom, totalFrames]);

  return { onMouseDown };
}