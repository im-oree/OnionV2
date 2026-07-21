/**
 * Z-order, align, and distribute utilities for layer stack manipulation.
 * Uses the compositionStore.reorderLayers action and updateLayer.
 */
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import type { Layer } from '../types/layer';

function withSelection(fn: (compId: string, comp: any, ids: string[]) => void): void {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;
  const ids = useSelectionStore.getState().getSelectedIds();
  if (ids.length === 0) return;
  fn(compId, comp, ids);
}

// ── Z-order ────────────────────────────────────────────────

export function bringToFront(): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const indices = ids.map(id => comp.layers.findIndex((l: any) => l.id === id))
      .filter(i => i >= 0).sort((a, b) => b - a);
    let insertAt = comp.layers.length - 1;
    for (const i of indices) {
      cs.reorderLayers(compId, i, insertAt);
      insertAt--;
    }
  });
}

export function bringForward(): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const indices = ids.map(id => comp.layers.findIndex((l: any) => l.id === id))
      .filter(i => i >= 0 && i < comp.layers.length - 1).sort((a, b) => b - a);
    for (const i of indices) cs.reorderLayers(compId, i, i + 1);
  });
}

export function sendBackward(): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const indices = ids.map(id => comp.layers.findIndex((l: any) => l.id === id))
      .filter(i => i > 0).sort((a, b) => a - b);
    for (const i of indices) cs.reorderLayers(compId, i, i - 1);
  });
}

export function sendToBack(): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const indices = ids.map(id => comp.layers.findIndex((l: any) => l.id === id))
      .filter(i => i >= 0).sort((a, b) => a - b);
    let insertAt = 0;
    for (const i of indices) {
      cs.reorderLayers(compId, i, insertAt);
      insertAt++;
    }
  });
}

export function resetTransform(): void {
  withSelection((compId, _comp, ids) => {
    const cs = useCompositionStore.getState();
    for (const id of ids) {
      cs.updateLayer(compId, id, {
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 100, y: 100 },
          rotation: 0,
          anchorPoint: { x: 0, y: 0 },
        },
      });
    }
  });
}

// ── Align ──────────────────────────────────────────────────

function getBounds(comp: any): { hw: number; hh: number } {
  return { hw: comp.width / 2, hh: comp.height / 2 };
}

function multiAlign(
  mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom',
  alignToComp: boolean,
): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const layers: Layer[] = ids.map(id => comp.layers.find((l: any) => l.id === id)).filter(Boolean);

    if (layers.length === 0) return;

    let refPos: { x: number; y: number };
    if (alignToComp) {
      const { hw, hh } = getBounds(comp);
      switch (mode) {
        case 'left':    refPos = { x: -hw + 50, y: 0 }; break;
        case 'right':   refPos = { x: hw - 50, y: 0 }; break;
        case 'top':     refPos = { x: 0, y: hh - 50 }; break;
        case 'bottom':  refPos = { x: 0, y: -hh + 50 }; break;
        case 'centerH': refPos = { x: 0, y: 0 }; break;
        case 'centerV': refPos = { x: 0, y: 0 }; break;
      }
    } else {
      const lastId = ids[ids.length - 1];
      const lastLayer = comp.layers.find((l: any) => l.id === lastId);
      if (!lastLayer) return;
      refPos = { x: lastLayer.transform.position.x, y: lastLayer.transform.position.y };
    }

    for (const layer of layers) {
      const t = { ...layer.transform, position: { ...layer.transform.position } };
      if (mode === 'left' || mode === 'centerH' || mode === 'right') t.position.x = refPos.x;
      if (mode === 'top' || mode === 'centerV' || mode === 'bottom') t.position.y = refPos.y;
      cs.updateLayer(compId, layer.id, { transform: t });
    }
  });
}

export function alignLeft(): void { multiAlign('left', false); }
export function alignCenterH(): void { multiAlign('centerH', false); }
export function alignRight(): void { multiAlign('right', false); }
export function alignTop(): void { multiAlign('top', false); }
export function alignCenterV(): void { multiAlign('centerV', false); }
export function alignBottom(): void { multiAlign('bottom', false); }

export function alignLeftToComp(): void { multiAlign('left', true); }
export function alignCenterHToComp(): void { multiAlign('centerH', true); }
export function alignRightToComp(): void { multiAlign('right', true); }
export function alignTopToComp(): void { multiAlign('top', true); }
export function alignCenterVToComp(): void { multiAlign('centerV', true); }
export function alignBottomToComp(): void { multiAlign('bottom', true); }

// ── Distribute ─────────────────────────────────────────────

export function distributeHorizontal(): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const layers = ids.map(id => comp.layers.find((l: any) => l.id === id)).filter(Boolean);
    if (layers.length < 3) return;
    const sorted = [...layers].sort(
      (a, b) => a.transform.position.x - b.transform.position.x,
    );
    const first = sorted[0].transform.position.x;
    const last = sorted[sorted.length - 1].transform.position.x;
    const step = (last - first) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const t = { ...sorted[i].transform, position: { ...sorted[i].transform.position } };
      t.position.x = first + step * i;
      cs.updateLayer(compId, sorted[i].id, { transform: t });
    }
  });
}

export function distributeVertical(): void {
  withSelection((compId, comp, ids) => {
    const cs = useCompositionStore.getState();
    const layers = ids.map(id => comp.layers.find((l: any) => l.id === id)).filter(Boolean);
    if (layers.length < 3) return;
    const sorted = [...layers].sort(
      (a, b) => b.transform.position.y - a.transform.position.y, // top→bottom
    );
    const first = sorted[0].transform.position.y;
    const last = sorted[sorted.length - 1].transform.position.y;
    const step = (last - first) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const t = { ...sorted[i].transform, position: { ...sorted[i].transform.position } };
      t.position.y = first + step * i;
      cs.updateLayer(compId, sorted[i].id, { transform: t });
    }
  });
}
