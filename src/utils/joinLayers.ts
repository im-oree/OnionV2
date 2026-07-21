/**
 * Join Layers — parent selected layers to the LAST-CLICKED layer,
 * preserving each child's WORLD transform.
 *
 * FIX: Guards against NaN/infinity scale transforms (which caused
 * "all white" visual artifacts) and clears stale effect quads on
 * reparented layers so the effects engine refreshes against the
 * new transform.
 */
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import { confirm } from '../ui/common/ConfirmDialog';
import type { Layer, Transform } from '../types/layer';

const degToRad = (d: number) => (d * Math.PI) / 180;

function wouldCreateCycle(layers: Layer[], childId: string, parentId: string): boolean {
  let current: string | null = parentId;
  const guard = new Set<string>();
  while (current) {
    if (current === childId) return true;
    if (guard.has(current)) return false;
    guard.add(current);
    const layer = layers.find((l) => l.id === current);
    current = layer?.parentId ?? null;
  }
  return false;
}

function makeChildLocalUnderParent(child: Layer, parent: Layer): Transform {
  const c = child.transform;
  const p = parent.transform;

  const psx = (p.scale.x || 100) / 100;
  const psy = (p.scale.y || 100) / 100;
  const prot = degToRad(p.rotation || 0);

  const dx = c.position.x - p.position.x;
  const dy = c.position.y - p.position.y;

  const cos = Math.cos(-prot);
  const sin = Math.sin(-prot);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;

  // Guard against divide-by-zero (which was producing NaN transforms →
  // the layer effectively vanishing or the shape geometry stretching
  // to fill the frame in white).
  const safePsx = Math.abs(psx) < 1e-4 ? 1 : psx;
  const safePsy = Math.abs(psy) < 1e-4 ? 1 : psy;

  const localScaleX = (c.scale.x / (p.scale.x || 100)) * 100;
  const localScaleY = (c.scale.y / (p.scale.y || 100)) * 100;

  return {
    position: { x: rx / safePsx, y: ry / safePsy },
    scale: {
      x: isFinite(localScaleX) ? localScaleX : c.scale.x,
      y: isFinite(localScaleY) ? localScaleY : c.scale.y,
    },
    rotation: c.rotation - p.rotation,
    anchorPoint: { ...c.anchorPoint },
  };
}

export async function joinSelectedLayers(): Promise<boolean> {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return false;

  const comp = cs.compositions.find((c) => c.id === compId);
  if (!comp) return false;

  const selectedIds = useSelectionStore.getState().getSelectedIds();
  if (selectedIds.length < 2) return false;

  // Parent = LAST-selected (index N-1). We also verify it exists.
  const parentLayerId = selectedIds[selectedIds.length - 1];
  const parentLayer = comp.layers.find((l) => l.id === parentLayerId);
  if (!parentLayer) return false;

  const childLayerIds = selectedIds.filter((id) => id !== parentLayerId);
  if (childLayerIds.length === 0) return false;

  for (const childId of childLayerIds) {
    if (wouldCreateCycle(comp.layers, childId, parentLayerId)) {
      alert('Cannot join — this would create a circular parent relationship.');
      return false;
    }
  }

  const yes = await confirm(
    `Parent ${childLayerIds.length} layer${childLayerIds.length > 1 ? 's' : ''} to "${parentLayer.name}"?`,
    'Join Layers',
    { confirmLabel: 'Join' },
  );
  if (!yes) return false;

  for (const childId of childLayerIds) {
    const childLayer = comp.layers.find((l) => l.id === childId);
    if (!childLayer) continue;
    const localTransform = makeChildLocalUnderParent(childLayer, parentLayer);
    cs.updateLayer(compId, childId, {
      parentId: parentLayerId,
      transform: localTransform,
    });
  }

  // Nudge the effects renderer so any cached effect quads on the reparented
  // layers get refreshed against the new transform (otherwise a stale quad
  // can visually cover the layer with its last-rendered contents).
  try {
    const renderer: any = (window as any).__renderer;
    for (const cid of childLayerIds) {
      renderer?.effectsRenderer?.removeLayerEffects?.(cid);
    }
    renderer?.renderLoop?.requestRender?.();
  } catch { /* ignore */ }

  return true;
}
