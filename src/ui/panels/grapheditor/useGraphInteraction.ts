import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
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
}

interface Options {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewBox: ViewState;
  setViewBox: (fn: (v: ViewState) => ViewState) => void;
  engine: any;
  curves: FlatCurve[];
  totalFrames: number;
  snapToFrame: boolean;
}

export function useGraphInteraction({
  svgRef, viewBox, setViewBox, engine, curves, totalFrames, snapToFrame,
}: Options) {
  const dragRef = useRef<DragState | null>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [boxSelectRect, setBoxSelectRect] = useState<BoxRect | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((vb) => {
      if (e.shiftKey) {
        const dh = vb.h * factor;
        return { ...vb, y: vb.y - (dh - vb.h) / 2, h: dh };
      }
      const dw = vb.w * factor;
      return { ...vb, x: vb.x - (dw - vb.w) / 2, w: dw };
    });
  }, [setViewBox]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = e.target as SVGElement;
    const kfId = target.getAttribute('data-kf-id');
    const handleType = target.getAttribute('data-handle');

    if (kfId && (handleType === 'in' || handleType === 'out')) {
      e.stopPropagation();
      const kf = findKf(engine, kfId);
      if (!kf) return;
      const orig = handleType === 'in' ? kf.inTangent : kf.outTangent;
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
      const kf = findKf(engine, kfId);
      if (!kf) return;
      dragRef.current = {
        type: 'keyframe',
        startMouse: { x: e.clientX, y: e.clientY },
        startView: { ...viewBox },
        kfId, origTime: kf.time,
        origValue: Array.isArray(kf.value) ? [...kf.value] : kf.value,
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
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        useKeyframeStore.getState().clearKeyframeSelection();
      }
      // Start box select
      const rx = e.clientX - rect.left;
      const ry = e.clientY - rect.top;
      dragRef.current = {
        type: 'box-select',
        startMouse: { x: rx, y: ry },
        startView: { ...viewBox },
        boxAdd: e.shiftKey || e.ctrlKey || e.metaKey,
      };
      setDragType('box-select');
      setBoxSelectRect({ x: rx, y: ry, w: 0, h: 0 });
    }
  }, [engine, viewBox, svgRef]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dxPx = e.clientX - d.startMouse.x;
      const dyPx = e.clientY - d.startMouse.y;

      if (d.type === 'pan') {
        const dxView = (dxPx / rect.width) * d.startView.w;
        const dyView = -(dyPx / rect.height) * d.startView.h;
        setViewBox(() => ({ ...d.startView, x: d.startView.x - dxView, y: d.startView.y + dyView }));
      } else if (d.type === 'keyframe' && d.kfId) {
        const dFrames = snapToFrame
          ? Math.round((dxPx / rect.width) * d.startView.w)
          : (dxPx / rect.width) * d.startView.w;
        const dValue = -(dyPx / rect.height) * d.startView.h;
        let newTime = (d.origTime ?? 0) + dFrames;
        newTime = Math.max(0, Math.min(totalFrames, newTime));
        const patch: Partial<Keyframe> = { time: Math.round(newTime) };
        if (typeof d.origValue === 'number') patch.value = d.origValue + dValue;
        else if (Array.isArray(d.origValue)) patch.value = d.origValue.map(v => v + dValue);
        useKeyframeStore.getState().engine.updateKeyframe(d.kfId, patch);
        useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
      } else if ((d.type === 'handleIn' || d.type === 'handleOut') && d.kfId && d.origHandle) {
        const dxNorm = (dxPx / rect.width) * (d.startView.w / 50);
        const dyNorm = (dyPx / rect.height) * (d.startView.h / 200);
        const signX = d.type === 'handleOut' ? 1 : -1;
        const signY = d.type === 'handleOut' ? -1 : 1;
        const newHandle = {
          x: Math.max(0, Math.min(1, d.origHandle.x + signX * dxNorm)),
          y: Math.max(-2, Math.min(2, d.origHandle.y + signY * dyNorm)),
        };
        const patch: any = d.type === 'handleIn'
          ? { inTangent: newHandle, interpolation: 'bezier' }
          : { outTangent: newHandle, interpolation: 'bezier' };
        useKeyframeStore.getState().engine.updateKeyframe(d.kfId, patch);
        useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
      } else if (d.type === 'box-select') {
        const rx = e.clientX - rect.left;
        const ry = e.clientY - rect.top;
        const x = Math.min(d.startMouse.x, rx);
        const y = Math.min(d.startMouse.y, ry);
        const w = Math.abs(rx - d.startMouse.x);
        const h = Math.abs(ry - d.startMouse.y);
        setBoxSelectRect({ x, y, w, h });
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (d?.type === 'box-select' && boxSelectRect) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          // Convert box screen rect → data range
          const box = boxSelectRect;
          const minF = ((box.x) / rect.width) * viewBox.w + viewBox.x;
          const maxF = ((box.x + box.w) / rect.width) * viewBox.w + viewBox.x;
          const maxV = viewBox.y + viewBox.h - ((box.y) / rect.height) * viewBox.h;
          const minV = viewBox.y + viewBox.h - ((box.y + box.h) / rect.height) * viewBox.h;
          const store = useKeyframeStore.getState();
          const newSel = new Set(d.boxAdd ? store.selectedKeyframeIds : []);
          for (const curve of curves) {
            for (const kf of curve.keyframes) {
              const v = Array.isArray(kf.value) ? (kf.value[curve.dimension] ?? 0) : kf.value;
              if (typeof v !== 'number') continue;
              if (kf.time >= minF && kf.time <= maxF && v >= minV && v <= maxV) {
                newSel.add(kf.id);
              }
            }
          }
          useKeyframeStore.setState({ selectedKeyframeIds: newSel });
        }
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
  }, [totalFrames, snapToFrame, viewBox, curves, boxSelectRect, svgRef, setViewBox]);

  return { handleMouseDown, handleWheel, dragType, boxSelectRect };
}

function findKf(engine: any, id: string): Keyframe | null {
  const data: Map<string, Map<string, Keyframe[]>> = engine._data;
  for (const [, propMap] of data) {
    for (const [, arr] of propMap) {
      for (const k of arr) if (k.id === id) return k;
    }
  }
  return null;
}