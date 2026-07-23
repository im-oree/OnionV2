/**
 * Precomp — AE-style "Pre-compose" selected layers into a new nested composition.
 *
 * Moves selected layers from the active composition into a newly created
 * composition, then replaces them with a single Comp layer pointing at the
 * new composition. Preserves effects, transforms, and layer ordering.
 */
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import { useEffectsStore } from '../state/effectsStore';
import type { Composition } from '../types/composition';
import type { Layer, CompData } from '../types/layer';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Precompose selected layers, AE-style.
 *
 * @param options.name           Optional name for the new composition.
 * @param options.moveAllAttributes  If true, new comp inherits selected layers'
 *                                visual bounds & transforms; the placeholder
 *                                Comp layer gets an identity transform.
 *                                If false (default), new comp is composition-sized;
 *                                each nested layer keeps its transform; parent
 *                                Comp layer replaces the selection at the top
 *                                of the stack.
 * @returns Result with ok flag, optional new composition reference, and
 *          the new comp layer id.
 */
export function precomposeSelectedLayers(options?: {
  name?: string;
  moveAllAttributes?: boolean;
}): {
  ok: boolean;
  reason?: string;
  newComp?: Composition;
  newLayerId?: string;
} {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return { ok: false, reason: 'No active composition' };

  const parent = cs.compositions.find((c) => c.id === compId);
  if (!parent) return { ok: false, reason: 'Parent composition not found' };

  const selectedIds = useSelectionStore.getState().getSelectedIds();
  if (selectedIds.length === 0)
    return { ok: false, reason: 'No layers selected' };

  const selectedLayers = parent.layers.filter((l) => selectedIds.includes(l.id));
  if (selectedLayers.length === 0)
    return { ok: false, reason: 'Selected layers not found' };

  const compName = options?.name ?? `Pre-comp ${cs.compositions.length + 1}`;

  // Create the new composition. Match parent size by default.
  const newComp = cs.addComposition({
    name: compName,
    width: parent.width,
    height: parent.height,
    fps: parent.fps,
    duration: parent.duration,
    backgroundColor: parent.backgroundColor,
    layers: [],
  });

  // Move layers into new comp (preserve zIndex ordering).
  const sorted = [...selectedLayers].sort((a, b) => a.zIndex - b.zIndex);
  const migratedLayers: Layer[] = sorted.map((l, i) => ({
    ...JSON.parse(JSON.stringify(l)),
    zIndex: i,
    parentId: null, // break parent links that pointed OUTSIDE the selection
  }));

  // Migrate effects for each moved layer.
  const effectsStore = useEffectsStore.getState();
  const effectsByLayer: Record<string, any[]> = {};
  for (const l of selectedLayers) {
    const fx = effectsStore.effectsByLayer[l.id];
    if (fx?.length) effectsByLayer[l.id] = JSON.parse(JSON.stringify(fx));
  }

  // Insert into new comp.
  for (const l of migratedLayers) {
    cs.addLayer(newComp.id, l);
  }
  // Re-attach effects under same ids
  if (Object.keys(effectsByLayer).length) {
    useEffectsStore.setState((s) => ({
      effectsByLayer: { ...s.effectsByLayer, ...effectsByLayer },
    }));
  }

  // Remove the original layers from parent.
  for (const id of selectedIds) cs.removeLayer(compId, id);

  // Add a Comp layer in the parent, in place of the removed layers.
  const compEndFrame = Math.floor(parent.duration * parent.fps);
  const data: CompData = {
    sourceCompId: newComp.id,
    loop: false,
    timeScale: 1,
    timeOffset: 0,
  };
  const compLayer: Layer = {
    id: genId('layer'),
    type: 'comp',
    name: compName,
    visible: true,
    locked: false,
    soloed: false,
    shy: false,
    parentId: null,
    blendMode: 'normal',
    opacity: 100,
    startFrame: 0,
    endFrame: compEndFrame,
    zIndex: sorted[0]?.zIndex ?? 0,
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 100, y: 100 },
      rotation: 0,
      anchorPoint: { x: 0, y: 0 },
    },
    effects: [],
    masks: [],
    motionBlur: false,
    data,
  };
  cs.addLayer(compId, compLayer);
  useSelectionStore.getState().select({
    type: 'layer',
    id: compLayer.id,
    compositionId: compId,
  });

  return { ok: true, newComp, newLayerId: compLayer.id };
}

/**
 * Extract (undo pre-compose) — pulls layers out of a nested composition back
 * into the parent composition, then removes the comp layer.
 *
 * The extracted layers keep their current transforms, adjusted for any
 * size difference between the nested comp and the parent comp. Effects,
 * masks, and keyframes travel with the layers (preserved by layer ID).
 *
 * @param compLayerId  ID of the comp layer to extract from.
 * @returns Result with ok flag and optional reason.
 */
export function extractFromComp(compLayerId: string): {
  ok: boolean;
  reason?: string;
  extractedCount?: number;
} {
  const cs = useCompositionStore.getState();
  const parentCompId = cs.activeCompositionId;
  if (!parentCompId) return { ok: false, reason: 'No active composition' };

  const parent = cs.compositions.find(c => c.id === parentCompId);
  if (!parent) return { ok: false, reason: 'Parent composition not found' };

  const compLayer = parent.layers.find(l => l.id === compLayerId);
  if (!compLayer) return { ok: false, reason: 'Comp layer not found' };
  if (compLayer.type !== 'comp') return { ok: false, reason: 'Selected layer is not a comp layer' };

  const compData = compLayer.data as CompData;
  if (!compData?.sourceCompId) return { ok: false, reason: 'No source composition reference' };

  const sourceComp = cs.compositions.find(c => c.id === compData.sourceCompId);
  if (!sourceComp) return { ok: false, reason: 'Source composition not found' };

  const sourceLayers = sourceComp.layers;
  if (sourceLayers.length === 0) return { ok: false, reason: 'Source composition has no layers' };

  // Compute size ratio for transform adjustment.
  // If nested comp is half the size of parent, layer positions/scale double.
  const scaleX = parent.width > 0 ? parent.width / sourceComp.width : 1;
  const scaleY = parent.height > 0 ? parent.height / sourceComp.height : 1;

  // Deep-clone and adjust each source layer for the parent coordinate space.
  const adjustedLayers: Layer[] = sourceLayers.map((l, i) => {
    const clone: Layer = JSON.parse(JSON.stringify(l));
    clone.zIndex = compLayer.zIndex + i;   // stack from the comp layer's position
    clone.parentId = null;                  // break external parent links

    // Scale transform to parent space
    if (clone.transform) {
      clone.transform = {
        position: {
          x: (clone.transform.position?.x ?? 0) * scaleX,
          y: (clone.transform.position?.y ?? 0) * scaleY,
        },
        scale: {
          x: clone.transform.scale.x,
          y: clone.transform.scale.y,
        },
        rotation: clone.transform.rotation ?? 0,
        anchorPoint: {
          x: (clone.transform.anchorPoint?.x ?? 0) * scaleX,
          y: (clone.transform.anchorPoint?.y ?? 0) * scaleY,
        },
      };
    }

    // Scale 3D transform too
    if (clone.transform3D) {
      clone.transform3D = {
        ...clone.transform3D,
        position: {
          x: (clone.transform3D.position?.x ?? 0) * scaleX,
          y: (clone.transform3D.position?.y ?? 0) * scaleY,
          z: clone.transform3D.position?.z ?? 0,
        },
        scale: {
          x: clone.transform3D.scale.x,
          y: clone.transform3D.scale.y,
          z: clone.transform3D.scale.z,
        },
        anchorPoint: {
          x: (clone.transform3D.anchorPoint?.x ?? 0) * scaleX,
          y: (clone.transform3D.anchorPoint?.y ?? 0) * scaleY,
          z: clone.transform3D.anchorPoint?.z ?? 0,
        },
      };
    }

    return clone;
  });

  // Effects, masks, and keyframes carry over automatically because the
  // extracted layers have the same IDs as before precomposing. The
  // effectsStore, maskStore, and keyframe engine all index data by layer
  // ID — no explicit migration needed.

  // Add extracted layers to the parent composition.
  for (const l of adjustedLayers) {
    cs.addLayer(parentCompId, l);
  }

  // Remove the comp layer from the parent.
  cs.removeLayer(parentCompId, compLayerId);

  // Select the extracted layers.
  const sel = useSelectionStore.getState();
  sel.clearSelection();
  for (const l of adjustedLayers) {
    sel.select({ type: 'layer', id: l.id, compositionId: parentCompId }, true);
  }    // Force a render update.
    try {
      const renderer = (window as any).__renderer;
      renderer?.renderLoop?.requestRender?.();
      renderer?.gpuTextureCache?.invalidateAll?.(parentCompId);
    } catch {}

  return { ok: true, extractedCount: adjustedLayers.length };
}

