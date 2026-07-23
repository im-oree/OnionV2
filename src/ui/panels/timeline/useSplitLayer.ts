import { useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { animationClock } from './PlaybackControls';
import { getSegments, type LayerSegment } from '../../../types/layer';

let _genId = () => `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Split all selected layers at the current playhead position.
 *
 * NEW BEHAVIOR (Phase 2B): splitting adds a segment to the SAME layer
 * rather than creating a new duplicate layer.
 *   - If the layer has no segments field yet → creates two segments
 *     (original range split at playhead)
 *   - If the layer already has segments → splits whichever segment
 *     the playhead is inside
 *
 * Video/audio segments get the correct `sourceOffset` so playback
 * continues seamlessly across the split.
 *
 * Keyframes are NOT split — they remain per-layer and evaluate normally.
 * Only segments carry the time-range and source-offset info.
 */
export function useSplitLayer() {
  return useCallback(() => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const frame = animationClock.currentFrame;
    const selectedIds = useSelectionStore.getState().getSelectedIds();

    // Find layers where the playhead is INSIDE any segment
    const targets = comp.layers.filter(l => {
      if (!selectedIds.includes(l.id)) return false;
      const segs = getSegments(l);
      return segs.some(s => frame > s.startFrame && frame < s.endFrame);
    });

    if (targets.length === 0) return;

    for (const layer of targets) {
      const oldSegments = getSegments(layer);
      const newSegments: LayerSegment[] = [];

      for (const seg of oldSegments) {
        if (frame > seg.startFrame && frame < seg.endFrame) {
          // Split THIS segment into two
          const framesIntoSeg = frame - seg.startFrame;

          // Left half — keeps original sourceOffset
          newSegments.push({
            id: `${layer.id}__seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            startFrame: seg.startFrame,
            endFrame: frame,
            sourceOffset: seg.sourceOffset,
          });

          // Right half — adjacent to left (visually touching at split frame)
          // sourceOffset advances by framesIntoSeg so source stays continuous
          newSegments.push({
            id: `${layer.id}__seg_${Date.now()}_${Math.random().toString(36).slice(2, 6) + 'r'}`,
            startFrame: frame,
            endFrame: seg.endFrame,
            sourceOffset: seg.sourceOffset + framesIntoSeg,
          });
        } else {
          // Segment untouched — preserve as-is
          newSegments.push(seg);
        }
      }

      // Update the layer with the new segments array.
      // The store's updateLayer syncs startFrame/endFrame from segments.
      cs.updateLayer(compId, layer.id, { segments: newSegments });
    }
  }, []);
}

/**
 * Trim start or end of selected layers to the current playhead frame.
 * Also removes keyframes that fall in the trimmed-away portion.
 *
 * direction = 'in'  → layer starts at playhead (deletes portion BEFORE playhead)
 * direction = 'out' → layer ends at playhead   (deletes portion AFTER playhead)
 *
 * For segmented layers: trims the relevant segment(s) and adjusts sourceOffset.
 */
export function useTrimToPlayhead() {
  return useCallback((direction: 'in' | 'out') => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const frame = animationClock.currentFrame;
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    if (selectedIds.length === 0) return;

    const kfStore = useKeyframeStore.getState();

    for (const id of selectedIds) {
      const layer = comp.layers.find(l => l.id === id);
      if (!layer) continue;

      const oldSegments = getSegments(layer);
      const hasSegments = !!layer.segments && layer.segments.length > 0;

      // Segmented path — trim segments that overlap with the removed side
      if (hasSegments) {
        const newSegments: LayerSegment[] = [];
        for (const seg of oldSegments) {
          if (direction === 'in') {
            // Remove everything before `frame`
            if (seg.endFrame <= frame) continue; // segment fully removed
            if (seg.startFrame >= frame) {
              // Segment fully kept
              newSegments.push(seg);
            } else {
              // Segment partially trimmed — advance sourceOffset
              const framesTrimmed = frame - seg.startFrame;
              newSegments.push({
                ...seg,
                startFrame: frame,
                sourceOffset: seg.sourceOffset + framesTrimmed,
              });
            }
          } else {
            // Remove everything after `frame`
            if (seg.startFrame >= frame) continue; // segment fully removed
            if (seg.endFrame <= frame) {
              newSegments.push(seg);
            } else {
              newSegments.push({
                ...seg,
                endFrame: frame,
              });
            }
          }
        }
        if (newSegments.length === 0) continue; // would leave empty layer, skip
        cs.updateLayer(compId, id, { segments: newSegments });
        // Remove keyframes outside the new layer bounds
        const newStart = Math.min(...newSegments.map(s => s.startFrame));
        const newEnd = Math.max(...newSegments.map(s => s.endFrame));
        const layerKfs = kfStore.engine.getAllKeyframesForLayer(id);
        for (const kf of layerKfs) {
          if (kf.time < newStart || kf.time > newEnd) kfStore.removeKeyframe(kf.id);
        }
        continue;
      }

      // Legacy single-segment path (unchanged)
      if (direction === 'in' && frame < layer.endFrame && frame > layer.startFrame) {
        const layerKfs = kfStore.engine.getAllKeyframesForLayer(id);
        for (const kf of layerKfs) {
          if (kf.time < frame) kfStore.removeKeyframe(kf.id);
        }
        cs.updateLayer(compId, id, { startFrame: frame });
      } else if (direction === 'out' && frame > layer.startFrame && frame < layer.endFrame) {
        const layerKfs = kfStore.engine.getAllKeyframesForLayer(id);
        for (const kf of layerKfs) {
          if (kf.time > frame) kfStore.removeKeyframe(kf.id);
        }
        cs.updateLayer(compId, id, { endFrame: frame });
      }
    }
  }, []);
}

/**
 * Trim BOTH sides of selected layers to a window around the playhead.
 * If no window is selected (default), collapses the layer to a single frame
 * at the playhead. Used for "cut everything except playhead frame" workflow.
 */
export function useTrimBothToPlayhead() {
  return useCallback((windowFrames = 0) => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const frame = animationClock.currentFrame;
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    if (selectedIds.length === 0) return;

    const kfStore = useKeyframeStore.getState();
    const halfWindow = Math.max(0, Math.floor(windowFrames / 2));

    for (const id of selectedIds) {
      const layer = comp.layers.find(l => l.id === id);
      if (!layer) continue;

      const newStart = Math.max(layer.startFrame, frame - halfWindow);
      const newEnd = Math.min(layer.endFrame, frame + halfWindow);
      if (newEnd <= newStart) continue;

      // Remove keyframes outside the new range
      const layerKfs = kfStore.engine.getAllKeyframesForLayer(id);
      for (const kf of layerKfs) {
        if (kf.time < newStart || kf.time > newEnd) kfStore.removeKeyframe(kf.id);
      }
      cs.updateLayer(compId, id, { startFrame: newStart, endFrame: newEnd });
    }
  }, []);
}

/**
 * Delete selected layers.
 */
export function useDeleteSelected() {
  return useCallback(() => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;

    const selectedIds = useSelectionStore.getState().getSelectedIds();
    if (selectedIds.length === 0) return;

    for (const id of selectedIds) {
      cs.removeLayer(compId, id);
    }
    useSelectionStore.getState().clearSelection();
  }, []);
}

/**
 * Ripple delete: delete selected layers and shift all subsequent layers backward.
 */
export function useRippleDelete() {
  return useCallback(() => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const selectedIds = useSelectionStore.getState().getSelectedIds();
    if (selectedIds.length === 0) return;

    let minStart = Infinity;
    let maxEnd = -Infinity;
    for (const id of selectedIds) {
      const l = comp.layers.find(ll => ll.id === id);
      if (l) {
        minStart = Math.min(minStart, l.startFrame);
        maxEnd = Math.max(maxEnd, l.endFrame);
      }
    }
    const gap = maxEnd - minStart;
    if (gap <= 0) return;

    const toDelete = [...selectedIds];
    for (const id of toDelete) {
      cs.removeLayer(compId, id);
    }
    useSelectionStore.getState().clearSelection();

    const updatedComp = cs.compositions.find(c => c.id === compId);
    if (!updatedComp) return;
    for (const l of updatedComp.layers) {
      if (l.startFrame >= maxEnd) {
        cs.updateLayer(compId, l.id, {
          startFrame: l.startFrame - gap,
          endFrame: l.endFrame - gap,
        }, true);
      }
    }
  }, []);
}

/**
 * Ripple insert: shift all layers at or after the playhead forward by `frames`.
 */
export function useRippleInsert() {
  return useCallback((frames: number) => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const frame = animationClock.currentFrame;
    for (const l of comp.layers) {
      if (l.startFrame >= frame) {
        cs.updateLayer(compId, l.id, {
          startFrame: l.startFrame + frames,
          endFrame: l.endFrame + frames,
        }, true);
      }
    }
  }, []);
}

/**
 * Solo/isolate selected layers — sets selected as soloed:true, all others soloed:false.
 * If ALL selected layers are already soloed, un-solos everything instead (toggle).
 */
export function useSoloSelected() {
  return useCallback(() => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const selectedIds = useSelectionStore.getState().getSelectedIds();
    if (selectedIds.length === 0) return;

    const allAlreadySoloed = selectedIds.every(id => {
      const l = comp.layers.find(ll => ll.id === id);
      return l?.soloed === true;
    });

    if (allAlreadySoloed) {
      // Un-solo everything
      for (const l of comp.layers) {
        if (l.soloed) cs.updateLayer(compId, l.id, { soloed: false } as any, true);
      }
    } else {
      // Solo selected, un-solo everything else
      for (const l of comp.layers) {
        const shouldSolo = selectedIds.includes(l.id);
        if (l.soloed !== shouldSolo) {
          cs.updateLayer(compId, l.id, { soloed: shouldSolo } as any, true);
        }
      }
    }
  }, []);
}