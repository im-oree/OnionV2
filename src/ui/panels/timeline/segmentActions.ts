/**
 * segmentActions — extract / merge segments across layers.
 * All operations preserve source-continuity via sourceOffset.
 */
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useNotificationStore } from '../../../state/notificationStore';
import { getSegments, type Layer, type LayerSegment } from '../../../types/layer';

function genLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function genSegmentId(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Extract a single segment from its source layer into a new independent layer.
 * The new layer:
 *   - Has the same position/type/effects/keyframes as the source
 *   - Contains no `segments` field (single-clip layer)
 *   - Uses `sourceOffset` on data field for correct playback
 * Source layer:
 *   - Loses the segment
 *   - If it becomes empty → auto-deleted
 */
export function extractSegmentToNewLayer(
  compId: string,
  sourceLayerId: string,
  segmentId: string,
): string | null {
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return null;

  const sourceLayer = comp.layers.find(l => l.id === sourceLayerId);
  if (!sourceLayer) return null;

  const segments = getSegments(sourceLayer);
  const target = segments.find(s => s.id === segmentId);
  if (!target) return null;

  // Build new independent layer
  const newLayer = buildLayerFromSegment(sourceLayer, target, comp.layers.length);
  const newLayerId = newLayer.id;

  // Rebuild source segments without this one
  const remaining = segments.filter(s => s.id !== segmentId);

  // Build the new layers array in one transaction
  const newLayers = [...comp.layers];
  if (remaining.length === 0) {
    // Auto-delete source layer
    const idx = newLayers.findIndex(l => l.id === sourceLayerId);
    if (idx >= 0) newLayers.splice(idx, 1);
  } else {
    // Update source layer with reduced segments
    newLayers.forEach((l, i) => {
      if (l.id === sourceLayerId) {
        newLayers[i] = updateLayerSegments(l, remaining);
      }
    });
  }
  // Insert new layer right after the source position
  const insertIdx = comp.layers.findIndex(l => l.id === sourceLayerId) + 1;
  newLayers.splice(insertIdx >= 0 ? insertIdx : newLayers.length, 0, newLayer);

  cs.updateComposition(compId, { layers: newLayers });
  return newLayerId;
}

/**
 * Extract multiple segments — each becomes its own new layer.
 * Returns array of new layer ids.
 */
export function extractSegmentsToIndividualLayers(
  compId: string,
  targets: Array<{ layerId: string; segmentId: string }>,
): string[] {
  if (targets.length === 0) return [];
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return [];

  // Group by source layer
  const bySource = new Map<string, string[]>();
  for (const t of targets) {
    const arr = bySource.get(t.layerId) ?? [];
    arr.push(t.segmentId);
    bySource.set(t.layerId, arr);
  }

  const newLayers: Layer[] = [...comp.layers];
  const createdIds: string[] = [];

  for (const [layerId, segmentIds] of bySource) {
    const idx = newLayers.findIndex(l => l.id === layerId);
    if (idx < 0) continue;
    const sourceLayer = newLayers[idx];
    const allSegs = getSegments(sourceLayer);

    // Build new layers for each requested segment
    for (const segId of segmentIds) {
      const seg = allSegs.find(s => s.id === segId);
      if (!seg) continue;
      const newLayer = buildLayerFromSegment(sourceLayer, seg, newLayers.length);
      newLayers.push(newLayer);
      createdIds.push(newLayer.id);
    }

    // Rebuild source with remaining segments
    const remaining = allSegs.filter(s => !segmentIds.includes(s.id));
    if (remaining.length === 0) {
      newLayers.splice(idx, 1);
    } else {
      newLayers[idx] = updateLayerSegments(sourceLayer, remaining);
    }
  }

  cs.updateComposition(compId, { layers: newLayers });
  return createdIds;
}

/**
 * Extract multiple segments into ONE new shared layer.
 * All segments become segments of the new layer at their current timeline positions.
 */
export function extractSegmentsToSharedLayer(
  compId: string,
  targets: Array<{ layerId: string; segmentId: string }>,
): string | null {
  if (targets.length === 0) return null;
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return null;

  // Gather all target segments AND their source layers
  const collectedSegs: LayerSegment[] = [];
  let primarySource: Layer | null = null;

  for (const t of targets) {
    const src = comp.layers.find(l => l.id === t.layerId);
    if (!src) continue;
    const seg = getSegments(src).find(s => s.id === t.segmentId);
    if (!seg) continue;
    collectedSegs.push({ ...seg, id: genSegmentId() });
    // Use the first found source as the "template" for the new layer
    if (!primarySource) primarySource = src;
  }

  if (!primarySource || collectedSegs.length === 0) return null;

  // Sort segments by startFrame for tidy rendering
  collectedSegs.sort((a, b) => a.startFrame - b.startFrame);

  // Compute new layer's bounds
  const minStart = Math.min(...collectedSegs.map(s => s.startFrame));
  const maxEnd = Math.max(...collectedSegs.map(s => s.endFrame));

  const newLayer: Layer = {
    ...JSON.parse(JSON.stringify(primarySource)),
    id: genLayerId(),
    name: `${primarySource.name} (moved)`,
    startFrame: minStart,
    endFrame: maxEnd,
    segments: collectedSegs,
    zIndex: comp.layers.length,
  };

  // Remove targeted segments from source layers
  const newLayers: Layer[] = [...comp.layers];
  const bySource = new Map<string, string[]>();
  for (const t of targets) {
    const arr = bySource.get(t.layerId) ?? [];
    arr.push(t.segmentId);
    bySource.set(t.layerId, arr);
  }
  // Iterate in reverse so index deletions don't shift
  for (let i = newLayers.length - 1; i >= 0; i--) {
    const l = newLayers[i];
    const idsToRemove = bySource.get(l.id);
    if (!idsToRemove) continue;
    const remaining = getSegments(l).filter(s => !idsToRemove.includes(s.id));
    if (remaining.length === 0) {
      newLayers.splice(i, 1);
    } else {
      newLayers[i] = updateLayerSegments(l, remaining);
    }
  }
  newLayers.push(newLayer);

  cs.updateComposition(compId, { layers: newLayers });
  return newLayer.id;
}

/**
 * Merge N target segments INTO the layer containing the specified pivot segment.
 * All other target segments are removed from their source layers and appended
 * as new segments of the pivot's parent layer.
 */
export function mergeSegmentsIntoLayer(
  compId: string,
  targets: Array<{ layerId: string; segmentId: string }>,
  pivotLayerId: string,
  pivotSegmentId: string,
): void {
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;

  const pivotLayer = comp.layers.find(l => l.id === pivotLayerId);
  if (!pivotLayer) return;

  // Collect segments to import (all targets except the pivot itself)
  const toImport: LayerSegment[] = [];
  const bySource = new Map<string, string[]>();
  for (const t of targets) {
    if (t.layerId === pivotLayerId && t.segmentId === pivotSegmentId) continue;
    const src = comp.layers.find(l => l.id === t.layerId);
    if (!src) continue;
    const seg = getSegments(src).find(s => s.id === t.segmentId);
    if (!seg) continue;
    toImport.push({ ...seg, id: genSegmentId() });
    const arr = bySource.get(t.layerId) ?? [];
    arr.push(t.segmentId);
    bySource.set(t.layerId, arr);
  }

  if (toImport.length === 0) return;

  const newLayers: Layer[] = [...comp.layers];

  // Remove targeted segments from their sources
  for (let i = newLayers.length - 1; i >= 0; i--) {
    const l = newLayers[i];
    const idsToRemove = bySource.get(l.id);
    if (!idsToRemove) continue;
    if (l.id === pivotLayerId) continue; // don't modify pivot's source list yet
    const remaining = getSegments(l).filter(s => !idsToRemove.includes(s.id));
    if (remaining.length === 0) {
      newLayers.splice(i, 1);
    } else {
      newLayers[i] = updateLayerSegments(l, remaining);
    }
  }

  // Add imported segments to pivot's layer
  const pivotIdx = newLayers.findIndex(l => l.id === pivotLayerId);
  if (pivotIdx < 0) return;
  const combined = [...getSegments(newLayers[pivotIdx]), ...toImport];
  combined.sort((a, b) => a.startFrame - b.startFrame);
  newLayers[pivotIdx] = updateLayerSegments(newLayers[pivotIdx], combined);

  cs.updateComposition(compId, { layers: newLayers });
}

// ── Internal helpers ──────────────────────────────────────────

function buildLayerFromSegment(
  sourceLayer: Layer,
  seg: LayerSegment,
  zIndexHint: number,
): Layer {
  // Deep clone all layer data so effects/keyframes/data are independent
  const clone: Layer = JSON.parse(JSON.stringify(sourceLayer));
  clone.id = genLayerId();
  clone.name = `${sourceLayer.name} (moved)`;
  clone.startFrame = seg.startFrame;
  clone.endFrame = seg.endFrame;
  clone.zIndex = zIndexHint;
  // Remove segments array — this is now a single-clip layer
  clone.segments = undefined;
  // For video/audio: persist sourceOffset on the data field
  if ((clone.type === 'video' || clone.type === 'audio') && clone.data) {
    (clone.data as any).sourceOffset = seg.sourceOffset;
  }
  return clone;
}

function updateLayerSegments(layer: Layer, segments: LayerSegment[]): Layer {
  // If only one segment remains and it spans the layer bounds — collapse to single-segment form
  if (segments.length === 1) {
    const s = segments[0];
    const updated: Layer = {
      ...layer,
      startFrame: s.startFrame,
      endFrame: s.endFrame,
      segments: undefined,
    };
    if ((updated.type === 'video' || updated.type === 'audio') && updated.data) {
      (updated.data as any).sourceOffset = s.sourceOffset;
    }
    return updated;
  }
  const minStart = Math.min(...segments.map(s => s.startFrame));
  const maxEnd = Math.max(...segments.map(s => s.endFrame));
  return {
    ...layer,
    startFrame: minStart,
    endFrame: maxEnd,
    segments,
  };
}

// ── Convenience wrappers ─────────────────────────────────────

export function extractCurrentSelectionToIndividualLayers(): void {
  const compId = useCompositionStore.getState().activeCompositionId;
  if (!compId) return;
  const targets = useSelectionStore.getState().getSelectedSegments();
  if (targets.length === 0) return;
  const ids = extractSegmentsToIndividualLayers(compId, targets);
  useSelectionStore.getState().clearSegmentSelection();
  useSelectionStore.getState().replaceSelection(ids, compId);
  useNotificationStore.getState().addNotification({
    type: 'success',
    message: `Extracted ${ids.length} segment${ids.length === 1 ? '' : 's'} to new layer${ids.length === 1 ? '' : 's'}`,
    autoDismiss: 3000,
  });
}

export function extractCurrentSelectionToSharedLayer(): void {
  const compId = useCompositionStore.getState().activeCompositionId;
  if (!compId) return;
  const targets = useSelectionStore.getState().getSelectedSegments();
  if (targets.length === 0) return;
  const id = extractSegmentsToSharedLayer(compId, targets);
  useSelectionStore.getState().clearSegmentSelection();
  if (id) useSelectionStore.getState().replaceSelection([id], compId);
  useNotificationStore.getState().addNotification({
    type: 'success',
    message: `Merged ${targets.length} segments into one new layer`,
    autoDismiss: 3000,
  });
}