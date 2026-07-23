import { useCallback, useRef } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../state/historyStore';
import { snapFrame, buildSnapTargets } from './snapping';
import { animationClock } from './PlaybackControls';
import { getSegments, type Layer, type LayerSegment } from '../../../types/layer';

export type DragMode = 'move' | 'trimStart' | 'trimEnd' | 'rippleStart' | 'rippleEnd' | 'slip' | 'roll';

interface LayerSnapshot {
  startFrame: number;
  endFrame: number;
  segments?: LayerSegment[]; // snapshot of segments for recovery
}

/**
 * Compute the maximum extension available for a video/audio layer.
 * For media: uses `data.duration` (seconds) × fps.
 * For everything else: allows extending up to composition duration.
 */
function getMaxExtent(layer: Layer, totalFrames: number, fps: number): number {
  if (layer.type === 'video' || layer.type === 'audio') {
    const dur = (layer.data as any)?.duration;
    if (typeof dur === 'number' && dur > 0) {
      return Math.floor(dur * fps);
    }
  }
  // No natural limit — allow up to comp end (or beyond, respecting totalFrames)
  return totalFrames;
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

    const selectedIds = useSelectionStore.getState().getSelectedIds();
    const dragIds = selectedIds.includes(layer.id) ? selectedIds : [layer.id];

    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    // Build snapshots — include segments so we can rebuild them correctly
    const snapshots = new Map<string, LayerSnapshot>();
    for (const id of dragIds) {
      const l = comp.layers.find(ll => ll.id === id);
      if (l) {
        snapshots.set(id, {
          startFrame: l.startFrame,
          endFrame: l.endFrame,
          segments: l.segments ? l.segments.map(s => ({ ...s })) : undefined,
        });
      }
    }
    if (!snapshots.has(layer.id)) {
      snapshots.set(layer.id, {
        startFrame: layer.startFrame,
        endFrame: layer.endFrame,
        segments: layer.segments ? layer.segments.map(s => ({ ...s })) : undefined,
      });
    }

    let adjacentId: string | undefined;
    if (mode === 'roll') {
      const sorted = [...comp.layers].sort((a, b) => b.zIndex - a.zIndex);
      const layerIdx = sorted.findIndex(l => l.id === layer.id);
      if (layerIdx > 0) {
        const prev = sorted[layerIdx - 1];
        if (prev && Math.abs(prev.endFrame - layer.startFrame) < 2) adjacentId = prev.id;
      }
    }

    const originalKeyframeTimes = new Map<string, Map<string, number>>();
    for (const id of dragIds) {
      const kfs = useKeyframeStore.getState().engine.getAllKeyframesForLayer(id);
      if (kfs.length > 0) {
        const timesMap = new Map<string, number>();
        for (const kf of kfs) timesMap.set(kf.id, kf.time);
        originalKeyframeTimes.set(id, timesMap);
      }
    }

    debouncedCapture('Move Layer');
    dragState.current = { mode, startX: e.clientX, snapshots, adjacentId, originalKeyframeTimes };

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

      const primary = st.snapshots.get(layer.id)!;
      const maxExtent = getMaxExtent(layer, totalFrames, comp.fps);

      let primaryStart = primary.startFrame;
      let primaryEnd = primary.endFrame;

      switch (st.mode) {
        case 'move':
          primaryStart = primary.startFrame + dxFrames;
          primaryEnd = primary.endFrame + dxFrames;
          break;
        case 'trimStart':
        case 'rippleStart':
          // Allow extending past 0 (negative timeline position)
          primaryStart = primary.startFrame + dxFrames;
          primaryStart = Math.min(primary.endFrame - 1, primaryStart);
          break;
        case 'trimEnd':
        case 'rippleEnd':
          primaryEnd = primary.endFrame + dxFrames;
          primaryEnd = Math.max(primary.startFrame + 1, primaryEnd);
          if (layer.type === 'video' || layer.type === 'audio') {
            primaryEnd = Math.min(maxExtent, primaryEnd);
          }
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

      // No more hard clamp — layers can extend past comp bounds
      if (primaryEnd <= primaryStart) primaryEnd = primaryStart + 1;

      const deltaStart = primaryStart - primary.startFrame;
      const deltaEnd = primaryEnd - primary.endFrame;
      const store = useCompositionStore.getState();

      if (st.mode === 'slip') {
        for (const [id, snap] of st.snapshots) {
          const dur = snap.endFrame - snap.startFrame;
          const ns = snap.startFrame + dxFrames;
          store.updateLayer(compId, id, { startFrame: ns, endFrame: ns + dur }, true);
        }
      } else if (st.mode === 'roll') {
        store.updateLayer(compId, layer.id, { startFrame: primaryStart, endFrame: primaryEnd }, true);
        if (st.adjacentId) {
          const adjSnap = st.snapshots.get(st.adjacentId);
          const adjStart = adjSnap?.startFrame ?? 0;
          const adjEnd = Math.max(adjStart + 1, primaryStart);
          store.updateLayer(compId, st.adjacentId, { endFrame: adjEnd }, true);
        }
      } else if (st.mode === 'rippleEnd') {
        const oldEnd = primary.endFrame;
        const rippleDelta = primaryEnd - oldEnd;
        // For segmented layer, adjust the LAST segment
        applyTrimEndToLayer(store, compId, layer.id, snap => snap, primary, primaryEnd);
        if (rippleDelta !== 0) {
          for (const l of comp.layers) {
            if (l.id === layer.id) continue;
            if (l.startFrame >= oldEnd) {
              store.updateLayer(compId, l.id, {
                startFrame: l.startFrame + rippleDelta,
                endFrame: l.endFrame + rippleDelta,
              }, true);
            }
          }
        }
      } else if (st.mode === 'rippleStart') {
        const oldStart = primary.startFrame;
        const rippleDelta = primaryStart - oldStart;
        applyTrimStartToLayer(store, compId, layer.id, primary, primaryStart);
        if (rippleDelta !== 0) {
          for (const l of comp.layers) {
            if (l.id === layer.id) continue;
            if (l.endFrame <= oldStart) {
              store.updateLayer(compId, l.id, {
                startFrame: l.startFrame + rippleDelta,
                endFrame: l.endFrame + rippleDelta,
              }, true);
            }
          }
        }
      } else {
        for (const [id, snap] of st.snapshots) {            if (st.mode === 'move') {
            const ns = snap.startFrame + deltaStart;
            const ne = snap.endFrame + deltaStart;
            // Also shift segments if they exist
            if (snap.segments) {
              const shift = ns - snap.startFrame;
              const newSegments = snap.segments.map(s => ({
                ...s,
                startFrame: s.startFrame + shift,
                endFrame: s.endFrame + shift,
              }));
              store.updateLayer(compId, id, {
                startFrame: ns, endFrame: ne, segments: newSegments,
              }, true);
            } else {
              store.updateLayer(compId, id, { startFrame: ns, endFrame: ne }, true);
            }
          } else if (st.mode === 'trimStart') {
            applyTrimStartToLayer(store, compId, id, snap, snap.startFrame + deltaStart);
          } else {
            // trimEnd
            applyTrimEndToLayer(store, compId, id, s => s, snap, snap.endFrame + deltaEnd);
          }

          if (st.mode === 'move' && st.originalKeyframeTimes) {
            const kfStore = useKeyframeStore.getState();
            const origTimes = st.originalKeyframeTimes.get(id);
            if (origTimes && origTimes.size > 0) {
              for (const [kfId, origTime] of origTimes) {
                const newTime = origTime + deltaStart;
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
      flushDebouncedSnapshot();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [layer.id, layer.startFrame, layer.endFrame, compId, zoom, totalFrames, layer, layer.type, layer.data]);

  return { onMouseDown };
}

/**
 * Drag a specific segment within a layer. Moves ONLY that segment,
 * leaving all others in the layer untouched. Also handles trim edges
 * for the specific segment.
 */
export function useSegmentDrag(
  layer: Layer,
  segmentId: string,
  compId: string,
  zoom: number,
  totalFrames: number,
): {
  onMouseDown: (mode: DragMode) => (e: React.MouseEvent) => void;
} {
  const dragState = useRef<{
    mode: DragMode;
    startX: number;
    startSegment: LayerSegment;
    allSegmentsSnapshot: LayerSegment[];
  } | null>(null);

  const onMouseDown = useCallback((mode: DragMode) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const currentLayer = comp.layers.find(l => l.id === layer.id);
    if (!currentLayer) return;

    const segs = getSegments(currentLayer);
    const startSegment = segs.find(s => s.id === segmentId);
    if (!startSegment) return;

    // Deep-copy snapshot so we don't mutate live objects
    const allSegmentsSnapshot = segs.map(s => ({ ...s }));

    debouncedCapture('Move Segment');
    dragState.current = {
      mode, startX: e.clientX,
      startSegment: { ...startSegment },
      allSegmentsSnapshot,
    };

    const maxExtent = getMaxExtent(layer, totalFrames, comp.fps);
    const snappingOn = useTimelineStore.getState().snapping;

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

      const useSnap = ev.ctrlKey ? !snappingOn : snappingOn;

      const orig = st.startSegment;
      const width = orig.endFrame - orig.startFrame;

      let newStart = orig.startFrame;
      let newEnd = orig.endFrame;
      let newSourceOffset = orig.sourceOffset;

      switch (st.mode) {
        case 'move':
          newStart = orig.startFrame + dxFrames;
          newEnd = newStart + width;
          break;

        case 'trimStart':
        case 'rippleStart': {
          const candidate = Math.max(0, Math.min(orig.endFrame - 1, orig.startFrame + dxFrames));
          const isMedia = layer.type === 'video' || layer.type === 'audio';
          if (isMedia) {
            const offsetDelta = candidate - orig.startFrame;
            newSourceOffset = Math.max(0, orig.sourceOffset + offsetDelta);
          }
          newStart = candidate;
          break;
        }

        case 'trimEnd':
        case 'rippleEnd': {
          const candidate = Math.max(orig.startFrame + 1, orig.endFrame + dxFrames);
          const isMedia = layer.type === 'video' || layer.type === 'audio';
          if (isMedia) {
            const framesUsed = orig.sourceOffset + (candidate - orig.startFrame);
            if (framesUsed > maxExtent) {
              newEnd = orig.startFrame + (maxExtent - orig.sourceOffset);
            } else {
              newEnd = candidate;
            }
          } else {
            newEnd = candidate;
          }
          break;
        }

        case 'slip': {
          const isMedia = layer.type === 'video' || layer.type === 'audio';
          if (isMedia) {
            newSourceOffset = Math.max(0, orig.sourceOffset - dxFrames);
          }
          break;
        }

        case 'roll': {
          // Roll: trim start + extend end (or vice versa), keeping width constant
          const isMedia = layer.type === 'video' || layer.type === 'audio';
          const delta = dxFrames;
          const newTrimStart = Math.max(0, Math.min(orig.endFrame - 1, orig.startFrame + delta));
          newStart = newTrimStart;
          newEnd = newStart + width;
          if (isMedia) {
            const offsetDelta = newTrimStart - orig.startFrame;
            newSourceOffset = Math.max(0, orig.sourceOffset + offsetDelta);
          }
          if (newEnd > totalFrames) {
            newEnd = totalFrames;
            newStart = newEnd - width;
          }
          break;
        }

        default:
          break;
      }

      // Apply snapping for move and trim modes
      if (useSnap && st.mode !== 'slip') {
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
        } else if (st.mode === 'trimStart' || st.mode === 'rippleStart') {
          newStart = snapFrame(newStart, targets, threshold).frame;
        } else if (st.mode === 'trimEnd' || st.mode === 'rippleEnd') {
          newEnd = snapFrame(newEnd, targets, threshold).frame;
        }
      }

      // No more hard clamp — layers can extend past comp bounds
      if (newEnd <= newStart) newEnd = newStart + 1;

      // Rebuild segments array with this segment updated
      const newSegments = st.allSegmentsSnapshot.map(s => {
        if (s.id !== segmentId) return s;
        return {
          ...s,
          startFrame: newStart,
          endFrame: newEnd,
          sourceOffset: newSourceOffset,
        };
      });

      // Sort by startFrame so segments render in order
      newSegments.sort((a, b) => a.startFrame - b.startFrame);

      useCompositionStore.getState().updateLayer(compId, layer.id, {
        segments: newSegments,
      }, true);
    };

    const onUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      flushDebouncedSnapshot();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [layer, segmentId, compId, zoom, totalFrames]);

  return { onMouseDown };
}

/**
 * Apply a trimStart to a layer, respecting segments.
 * When the layer has segments, the FIRST segment gets its startFrame changed
 * and its sourceOffset adjusted so playback continues seamlessly.
 */
function applyTrimStartToLayer(
  store: ReturnType<typeof useCompositionStore.getState>,
  compId: string,
  layerId: string,
  snap: LayerSnapshot,
  newStart: number,
): void {
  if (!snap.segments || snap.segments.length === 0) {
    // Legacy single-segment path
    let ns = Math.max(0, newStart);
    let ne = snap.endFrame;
    if (ne <= ns) ne = ns + 1;
    store.updateLayer(compId, layerId, { startFrame: ns, endFrame: ne }, true);
    return;
  }

  // Segmented path — adjust FIRST segment
  const first = snap.segments[0];
  const rest = snap.segments.slice(1);
  const clampedStart = Math.min(first.endFrame - 1, newStart);
  // sourceOffset shifts by how far we moved startFrame
  // moving LEFT (extend) → offset decreases (revealing earlier source)
  // moving RIGHT (trim) → offset increases (skip more source)
  const offsetDelta = clampedStart - first.startFrame;
  const newFirst: LayerSegment = {
    ...first,
    startFrame: clampedStart,
    sourceOffset: Math.max(0, first.sourceOffset + offsetDelta),
  };
  store.updateLayer(compId, layerId, {
    segments: [newFirst, ...rest],
  }, true);
}

/**
 * Apply a trimEnd to a layer, respecting segments.
 * When the layer has segments, the LAST segment gets its endFrame changed.
 * sourceOffset stays the same (we're extending/trimming the RIGHT side).
 */
function applyTrimEndToLayer(
  store: ReturnType<typeof useCompositionStore.getState>,
  compId: string,
  layerId: string,
  _identity: (s: LayerSnapshot) => LayerSnapshot,
  snap: LayerSnapshot,
  newEnd: number,
): void {
  if (!snap.segments || snap.segments.length === 0) {
    let ns = snap.startFrame;
    let ne = newEnd;
    if (ne <= ns) ne = ns + 1;
    store.updateLayer(compId, layerId, { startFrame: ns, endFrame: ne }, true);
    return;
  }

  // Segmented path — adjust LAST segment
  const last = snap.segments[snap.segments.length - 1];
  const before = snap.segments.slice(0, -1);
  const clampedEnd = Math.max(last.startFrame + 1, newEnd);
  const newLast: LayerSegment = {
    ...last,
    endFrame: clampedEnd,
  };
  store.updateLayer(compId, layerId, {
    segments: [...before, newLast],
  }, true);
}