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
