import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../state/historyStore';
import type { Keyframe } from '../../../types/keyframe';
import type { FlatCurve } from './GraphCurves';

export interface ViewState { x: number; y: number; w: number; h: number; }
export interface BoxRect { x: number; y: number; w: number; h: number; }
type DragType = 'pan' | 'keyframe' | 'handleIn' | 'handleOut' | 'box-select' | null;

interface DragState {
  type: DragType;
  startMouse: { x: number; y: number };
  startView: ViewState;
  kfId?: string;
  origTime?: number;
  origValue?: number | number[];
  origHandle?: { x: number; y: number };
  boxAdd?: boolean;
  multiSnapshot?: Map<string, { time: number; value: number | number[] }>;
}

interface Options {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewBox: ViewState;
  setViewBox: (fn: (v: ViewState) => ViewState) => void;
  engine: any;
  curves: FlatCurve[];
  totalFrames: number;
  snapToFrame: boolean;
  svgWidth: number;
  svgHeight: number;
}

function findKf(engine: any, id: string): Keyframe | null {
  const data: Map<string, Map<string, Keyframe[]>> = engine._data;
  for (const [, propMap] of data)
    for (const [, arr] of propMap)
      for (const k of arr) if (k.id === id) return k;
  return null;
}

export function useGraphInteraction({
  svgRef, viewBox, setViewBox, engine, curves, totalFrames, snapToFrame,
  svgWidth, svgHeight,
}: Options) {
  const dragRef = useRef<DragState | null>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [boxSelectRect, setBoxSelectRect] = useState<BoxRect | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    setViewBox((vb) => {
      const zoomY = e.shiftKey || e.altKey;
      const zoomX = !e.shiftKey;
      const nw = zoomX ? vb.w * factor : vb.w;
      const nh = zoomY ? vb.h * factor : vb.h;
      const anchorF = vb.x + vb.w * mx;
      const anchorV = vb.y + vb.h * (1 - my);
      return { x: anchorF - nw * mx, y: anchorV - nh * (1 - my), w: nw, h: nh };
    });
  }, [setViewBox, svgRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = e.target as SVGElement;
    // Don't interfere with context menu clicks
    if (target.closest?.('[data-ctx-menu]')) return;
    // Use closest() to find data-kf-id and data-handle on parent <g> elements
    // because e.target is often the inner <circle>/<polygon>, not the <g>
    const kfEl = target.closest?.('[data-kf-id]') as SVGElement | null;
    const kfId = kfEl?.getAttribute('data-kf-id') ?? null;
    const handleType = kfEl?.getAttribute('data-handle') ?? target.getAttribute('data-handle');

    if (kfId && (handleType === 'in' || handleType === 'out')) {
      e.stopPropagation();
      useKeyframeStore.getState().selectKeyframe(kfId, false);
      const kf = findKf(engine, kfId); if (!kf) return;
      const orig = handleType === 'in' ? kf.inTangent : kf.outTangent;
      debouncedCapture('Edit Bezier Handle');
      dragRef.current = {
        type: handleType === 'in' ? 'handleIn' : 'handleOut',
        startMouse: { x: e.clientX, y: e.clientY },
        startView: { ...viewBox },
        kfId, origHandle: { ...(orig ?? { x: 0.333, y: 0 }) },
      };
      setDragType(dragRef.current.type);
      return;
    }

    if (kfId) {
      e.stopPropagation();
      const store = useKeyframeStore.getState();
      if (e.shiftKey || e.ctrlKey || e.metaKey) store.toggleKeyframeSelection(kfId);
      else if (!store.selectedKeyframeIds.has(kfId)) store.selectKeyframe(kfId, false);
      const kf = findKf(engine, kfId); if (!kf) return;
      debouncedCapture('Move Keyframes');
      const snap = new Map<string, { time: number; value: number | number[] }>();
      const sel = useKeyframeStore.getState().selectedKeyframeIds;
      const data: Map<string, Map<string, Keyframe[]>> = engine._data;
      for (const [, propMap] of data)
        for (const [, arr] of propMap)
          for (const k of arr)
            if (sel.has(k.id))
              snap.set(k.id, { time: k.time, value: Array.isArray(k.value) ? [...k.value] : k.value });
      dragRef.current = {
        type: 'keyframe',
        startMouse: { x: e.clientX, y: e.clientY },
        startView: { ...viewBox },
        kfId, origTime: kf.time,
        origValue: Array.isArray(kf.value) ? [...kf.value] : kf.value,
        multiSnapshot: snap,
      };
      setDragType('keyframe');
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.shiftKey && !e.ctrlKey)) {
      e.preventDefault();
      dragRef.current = { type: 'pan', startMouse: { x: e.clientX, y: e.clientY }, startView: { ...viewBox } };
      setDragType('pan');
      return;
    }

    if (e.button === 0) {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey)
        useKeyframeStore.getState().clearKeyframeSelection();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      dragRef.current = {
        type: 'box-select',
        startMouse: { x: px, y: py },
        startView: { ...viewBox },
        boxAdd: e.shiftKey || e.ctrlKey || e.metaKey,
      };
      setDragType('box-select');
      setBoxSelectRect({ x: px, y: py, w: 0, h: 0 });
    }
  }, [engine, viewBox, svgRef]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return;
      const dxPx = e.clientX - d.startMouse.x;
      const dyPx = e.clientY - d.startMouse.y;

      if (d.type === 'pan') {
        const dxView = (dxPx / rect.width) * d.startView.w;
        const dyView = (dyPx / rect.height) * d.startView.h;
        setViewBox(() => ({ ...d.startView, x: d.startView.x - dxView, y: d.startView.y + dyView }));
      } else if (d.type === 'keyframe' && d.kfId && d.multiSnapshot) {
        const dFramesRaw = (dxPx / rect.width) * d.startView.w;
        const dFrames = snapToFrame ? Math.round(dFramesRaw) : dFramesRaw;
        const dValue = -(dyPx / rect.height) * d.startView.h;
        const eng = useKeyframeStore.getState().engine;
        for (const [id, snap] of d.multiSnapshot) {
          let nt = snap.time + dFrames;
          nt = Math.max(0, Math.min(totalFrames, snapToFrame ? Math.round(nt) : nt));
          const patch: Partial<Keyframe> = { time: nt };
          if (typeof snap.value === 'number') patch.value = snap.value + dValue;
          else if (Array.isArray(snap.value)) patch.value = snap.value.map(v => v + dValue);
          eng.updateKeyframe(id, patch);
        }
        useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
      } else if ((d.type === 'handleIn' || d.type === 'handleOut') && d.kfId && d.origHandle) {
        // Constant sensitivity: ~0.4 tangent-x units per full SVG width drag,
        // ~1.2 tangent-y units per full SVG height drag
        const dxNorm = (dxPx / rect.width) * 0.4;
        const dyNorm = (dyPx / rect.height) * 1.2;
        const signX = d.type === 'handleOut' ? 1 : -1;
        // Both in and out handles move UP when mouse goes UP (negative dyPx).
        // signY is always -1 so that drag-up (dyNorm<0) → tangent.y increases.
        const signY = -1;
        // Shift key: snap handle Y to 0 (horizontal) — prevents rotation, only allows stretch
      const handleY = e.shiftKey ? 0 : Math.max(-3, Math.min(3, d.origHandle.y + signY * dyNorm));
      const newHandle = {
          x: Math.max(0, Math.min(1, d.origHandle.x + signX * dxNorm)),
          y: handleY,
        };
        const patch: any = d.type === 'handleIn'
          ? { inTangent: newHandle, interpolation: 'bezier' }
          : { outTangent: newHandle, interpolation: 'bezier' };
        useKeyframeStore.getState().engine.updateKeyframe(d.kfId, patch);
        useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
      } else if (d.type === 'box-select') {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setBoxSelectRect({
          x: Math.min(d.startMouse.x, px), y: Math.min(d.startMouse.y, py),
          w: Math.abs(px - d.startMouse.x), h: Math.abs(py - d.startMouse.y),
        });
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      // Flush undo snapshot for graph edits that modified keyframes
      if (d?.type === 'keyframe' || d?.type === 'handleIn' || d?.type === 'handleOut') {
        flushDebouncedSnapshot();
      }
      if (d?.type === 'box-select' && boxSelectRect && svgWidth > 0 && svgHeight > 0) {
        const box = boxSelectRect;
        const minF = (box.x / svgWidth) * viewBox.w + viewBox.x;
        const maxF = ((box.x + box.w) / svgWidth) * viewBox.w + viewBox.x;
        const maxV = viewBox.y + viewBox.h - (box.y / svgHeight) * viewBox.h;
        const minV = viewBox.y + viewBox.h - ((box.y + box.h) / svgHeight) * viewBox.h;
        const store = useKeyframeStore.getState();
        const newSel = new Set(d.boxAdd ? store.selectedKeyframeIds : []);
        for (const curve of curves)
          for (const kf of curve.keyframes) {
            const v = Array.isArray(kf.value) ? (kf.value[curve.dimension] ?? 0) : kf.value;
            if (typeof v !== 'number') continue;
            if (kf.time >= minF && kf.time <= maxF && v >= minV && v <= maxV) newSel.add(kf.id);
          }
        useKeyframeStore.setState({ selectedKeyframeIds: newSel });
      }
      dragRef.current = null;
      setDragType(null);
      setBoxSelectRect(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [totalFrames, snapToFrame, viewBox, curves, boxSelectRect, svgRef, setViewBox, svgWidth, svgHeight]);

  return { handleMouseDown, handleWheel, dragType, boxSelectRect };
}
