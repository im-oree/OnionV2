import { useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { animationClock } from './PlaybackControls';

let _genId = () => `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Split all selected layers at the current playhead position.
 * Original layer's endFrame → splitFrame, new duplicate gets startFrame → splitFrame+1.
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

    const layersToSplit = comp.layers.filter(
      l => selectedIds.includes(l.id) && frame > l.startFrame && frame < l.endFrame
    );

    if (layersToSplit.length === 0) return;

    // Process from highest zIndex first so insertion order is correct
    const sorted = [...layersToSplit].sort((a, b) => b.zIndex - a.zIndex);

    // Collect all new layers to insert at once
    const insertions: { afterId: string; layer: typeof comp.layers[0] }[] = [];

    for (const layer of sorted) {
      const splitFrame = frame;

      // 1. Trim original layer to end at splitFrame
      cs.updateLayer(compId, layer.id, { endFrame: splitFrame });

      // 2. Create duplicate for the right side
      const dup = JSON.parse(JSON.stringify(layer));
      dup.id = _genId();
      dup.name = `${layer.name}`;
      dup.startFrame = splitFrame + 1;
      dup.endFrame = layer.endFrame;
      dup.zIndex = layer.zIndex;

      // 3. Shift keyframes for the duplicate
      const kfStore = useKeyframeStore.getState();
      const layerKfs = kfStore.engine.getKeyframesForLayer(layer.id);
      const shiftFrames = (splitFrame + 1) - layer.startFrame;

      for (const kf of layerKfs) {
        if (kf.time > splitFrame) {
          const newTime = kf.time - shiftFrames;
          if (newTime >= 0) {
            kfStore.addKeyframe(dup.id, {
              ...kf,
              id: _genId(),
              layerId: dup.id,
              time: newTime,
            });
          }
        }
      }

      insertions.push({ afterId: layer.id, layer: dup });
    }

    // Insert all duplicates at once by updating the layers array
    if (insertions.length > 0) {
      const currentLayers = [...(cs.compositions.find(c => c.id === compId)?.layers ?? [])];
      // Process insertions in reverse to maintain correct indices
      for (let i = insertions.length - 1; i >= 0; i--) {
        const { afterId, layer: dup } = insertions[i];
        const idx = currentLayers.findIndex(l => l.id === afterId);
        if (idx !== -1) {
          currentLayers.splice(idx + 1, 0, dup);
        }
      }
      cs.updateComposition(compId, { layers: currentLayers });

      // Select all duplicates
      const selStore = useSelectionStore.getState();
      for (const { layer: dup } of insertions) {
        selStore.select({ type: 'layer', id: dup.id, compositionId: compId }, true);
      }
    }
  }, []);
}

/**
 * Trim the start or end of selected layers to the current playhead frame.
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

    for (const id of selectedIds) {
      const layer = comp.layers.find(l => l.id === id);
      if (!layer) continue;
      if (direction === 'in' && frame < layer.endFrame) {
        cs.updateLayer(compId, id, { startFrame: frame });
      } else if (direction === 'out' && frame > layer.startFrame) {
        cs.updateLayer(compId, id, { endFrame: frame });
      }
    }
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

    // Find the min start and max end of selected layers
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

    // Collect all layers to delete, then batch remove
    const toDelete = [...selectedIds];
    for (const id of toDelete) {
      cs.removeLayer(compId, id);
    }
    useSelectionStore.getState().clearSelection();

    // Shift all layers that start at or after maxEnd backward
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
 * (exported for potential menu integration)
 */
export function useRippleInsert() {
  return useCallback((_frames: number) => {
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
