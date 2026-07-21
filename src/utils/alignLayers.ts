/**
 * Align + Distribute utilities.
 *
 * Two align targets:
 *   - 'composition' — align to comp bounds (default)
 *   - 'selection'   — align to bounding box of the selection
 */
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import type { Layer } from '../types/layer';

export type AlignMode =
  | 'left' | 'centerH' | 'right'
  | 'top'  | 'centerV' | 'bottom';

export type AlignTarget = 'composition' | 'selection';

function getLayerLocalSize(layer: Layer): { w: number; h: number } {
  const d: any = layer.data;
  if (layer.type === 'solid' && d) return { w: d.width ?? 100, h: d.height ?? 100 };
  if ((layer.type === 'image' || layer.type === 'video') && d)
    return { w: d.naturalWidth ?? 100, h: d.naturalHeight ?? 100 };
  if (layer.type === 'shape' && d) {
    if (d.type === 'rectangle') return { w: d.width ?? 100, h: d.height ?? 100 };
    if (d.type === 'ellipse')   return { w: (d.radiusX ?? 50) * 2, h: (d.radiusY ?? 50) * 2 };
    if (d.type === 'polygon' || d.type === 'star') return { w: (d.radius ?? 50) * 2, h: (d.radius ?? 50) * 2 };
    if (d.type === 'path' && d.bounds)
      return { w: Math.max(1, d.bounds.maxX - d.bounds.minX), h: Math.max(1, d.bounds.maxY - d.bounds.minY) };
    if (d.type === 'custom') return { w: d.width ?? 100, h: d.height ?? 100 };
  }
  if (layer.type === 'text') return { w: 300, h: 100 };
  return { w: 100, h: 100 };
}

function layerBounds(layer: Layer) {
  const size = getLayerLocalSize(layer);
  const sx = layer.transform.scale.x / 100;
  const sy = layer.transform.scale.y / 100;
  const hw = (size.w * Math.abs(sx)) / 2;
  const hh = (size.h * Math.abs(sy)) / 2;
  const px = layer.transform.position.x;
  const py = layer.transform.position.y;
  return { hw, hh, left: px - hw, right: px + hw, top: py + hh, bottom: py - hh };
}

function withSelection(fn: (compId: string, comp: any, layers: Layer[]) => void): void {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;
  const ids = useSelectionStore.getState().getSelectedIds();
  const layers = comp.layers.filter(l => ids.includes(l.id));
  if (layers.length === 0) return;
  fn(compId, comp, layers);
}

export function alignLayers(mode: AlignMode, target: AlignTarget): void {
  withSelection((compId, comp, layers) => {
    const cs = useCompositionStore.getState();

    let targetLeft: number, targetRight: number, targetTop: number, targetBottom: number;
    if (target === 'composition') {
      targetLeft = -comp.width / 2; targetRight = comp.width / 2;
      targetTop = comp.height / 2;  targetBottom = -comp.height / 2;
    } else {
      // Selection bounds
      let l = Infinity, r = -Infinity, t = -Infinity, b = Infinity;
      for (const layer of layers) {
        const bd = layerBounds(layer);
        l = Math.min(l, bd.left);  r = Math.max(r, bd.right);
        t = Math.max(t, bd.top);   b = Math.min(b, bd.bottom);
      }
      targetLeft = l; targetRight = r; targetTop = t; targetBottom = b;
    }

    const centerX = (targetLeft + targetRight) / 2;
    const centerY = (targetTop + targetBottom) / 2;

    for (const layer of layers) {
      const bd = layerBounds(layer);
      const cur = layer.transform.position;
      let newX = cur.x, newY = cur.y;
      switch (mode) {
        case 'left':    newX = targetLeft + bd.hw; break;
        case 'right':   newX = targetRight - bd.hw; break;
        case 'centerH': newX = centerX; break;
        case 'top':     newY = targetTop - bd.hh; break;
        case 'bottom':  newY = targetBottom + bd.hh; break;
        case 'centerV': newY = centerY; break;
      }
      cs.updateLayer(compId, layer.id, {
        transform: { ...layer.transform, position: { x: newX, y: newY } },
      });
    }
  });
}

export function distributeLayers(axis: 'horizontal' | 'vertical'): void {
  withSelection((compId, _comp, layers) => {
    if (layers.length < 3) return;
    const cs = useCompositionStore.getState();

    const sorted = [...layers].sort((a, b) =>
      axis === 'horizontal' ? a.transform.position.x - b.transform.position.x
                            : b.transform.position.y - a.transform.position.y,
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const startPos = axis === 'horizontal' ? first.transform.position.x : first.transform.position.y;
    const endPos   = axis === 'horizontal' ? last.transform.position.x  : last.transform.position.y;
    const step = (endPos - startPos) / (sorted.length - 1);

    sorted.forEach((layer, i) => {
      if (i === 0 || i === sorted.length - 1) return;
      const newPos = startPos + step * i;
      cs.updateLayer(compId, layer.id, {
        transform: {
          ...layer.transform,
          position: axis === 'horizontal'
            ? { x: newPos, y: layer.transform.position.y }
            : { x: layer.transform.position.x, y: newPos },
        },
      });
    });
  });
}
