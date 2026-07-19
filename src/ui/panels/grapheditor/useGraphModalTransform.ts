import { useEffect } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import type { ViewState } from './useGraphInteraction';
import type { Keyframe } from '../../../types/keyframe';

interface Opts {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewBox: ViewState;
  snapToFrame: boolean;
  totalFrames: number;
}

type Mode = 'grab' | 'scale' | 'rotate' | null;

export function useGraphModalTransform({ svgRef, viewBox, snapToFrame, totalFrames }: Opts) {
  useEffect(() => {
    let mode: Mode = null;
    let axis: 'x' | 'y' | null = null;
    let start: { x: number; y: number } | null = null;
    let center: { time: number; value: number } | null = null;
    let snapshot: Map<string, { time: number; value: number | number[] }> | null = null;
    let overlay: HTMLDivElement | null = null;

    const showOverlay = (text: string) => {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.style.cssText = `
          position:fixed;pointer-events:none;z-index:99999;
          background:var(--color-panel-raised);border-radius:6px;padding:4px 10px;
          font:600 11px var(--font-family-mono);color:var(--color-accent);
          box-shadow:var(--shadow-dropdown);
        `;
        document.body.appendChild(overlay);
      }
      overlay.textContent = text;
    };

    const clearOverlay = () => { overlay?.remove(); overlay = null; };

    const takeSnapshot = () => {
      const sel = useKeyframeStore.getState().selectedKeyframeIds;
      if (sel.size === 0) return null;
      const engine: any = useKeyframeStore.getState().engine;
      const map = new Map<string, { time: number; value: number | number[] }>();
      let tSum = 0, vSum = 0, count = 0;
      for (const [, propMap] of engine._data as Map<string, Map<string, Keyframe[]>>) {
        for (const [, arr] of propMap) {
          for (const k of arr) {
            if (sel.has(k.id)) {
              const val = Array.isArray(k.value) ? k.value[0] : k.value;
              map.set(k.id, { time: k.time, value: Array.isArray(k.value) ? [...k.value] : k.value });
              tSum += k.time; vSum += typeof val === 'number' ? val : 0; count++;
            }
          }
        }
      }
      if (count === 0) return null;
      center = { time: tSum / count, value: vSum / count };
      return map;
    };

    const cancel = () => {
      if (!snapshot) return;
      const engine: any = useKeyframeStore.getState().engine;
      for (const [id, orig] of snapshot) engine.updateKeyframe(id, { time: orig.time, value: orig.value });
      useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
      end();
    };

    const commit = () => end();

    const end = () => {
      mode = null; axis = null; start = null; center = null; snapshot = null;
      clearOverlay();
    };

    const svgRect = () => svgRef.current?.getBoundingClientRect() ?? null;

    const onMove = (e: MouseEvent) => {
      if (!mode || !start || !snapshot || !center) return;
      const rect = svgRect(); if (!rect) return;
      const dxPx = e.clientX - start.x;
      const dyPx = e.clientY - start.y;
      const engine: any = useKeyframeStore.getState().engine;

      if (mode === 'grab') {
        const dFramesRaw = (dxPx / rect.width) * viewBox.w;
        const dValRaw = -(dyPx / rect.height) * viewBox.h;
        const dF = axis === 'y' ? 0 : (snapToFrame ? Math.round(dFramesRaw) : dFramesRaw);
        const dV = axis === 'x' ? 0 : dValRaw;
        for (const [id, s] of snapshot) {
          const nt = Math.max(0, Math.min(totalFrames, s.time + dF));
          const nv = typeof s.value === 'number' ? s.value + dV
            : Array.isArray(s.value) ? s.value.map(v => v + dV) : s.value;
          engine.updateKeyframe(id, { time: nt, value: nv });
        }
        showOverlay(`G ${axis ?? ''}  Δf ${dF.toFixed(0)}  Δv ${dV.toFixed(2)}`);
      } else if (mode === 'scale') {
        const factor = 1 + (dxPx / rect.width) * 3;
        const sX = axis === 'y' ? 1 : factor;
        const sY = axis === 'x' ? 1 : factor;
        for (const [id, s] of snapshot) {
          let nt = center.time + (s.time - center.time) * sX;
          nt = Math.max(0, Math.min(totalFrames, snapToFrame ? Math.round(nt) : nt));
          const scaleV = (v: number) => center!.value + (v - center!.value) * sY;
          const nv = typeof s.value === 'number' ? scaleV(s.value)
            : Array.isArray(s.value) ? s.value.map(scaleV) : s.value;
          engine.updateKeyframe(id, { time: nt, value: nv });
        }
        showOverlay(`S ${axis ?? ''}  ×${factor.toFixed(2)}`);
      } else if (mode === 'rotate') {
        const angle = (dxPx / rect.width) * Math.PI * 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const fScale = viewBox.w / rect.width;
        const vScale = viewBox.h / rect.height;
        for (const [id, s] of snapshot) {
          const val0 = typeof s.value === 'number' ? s.value : Array.isArray(s.value) ? s.value[0] : 0;
          const dt = (s.time - center.time) / fScale;
          const dv = (val0 - center.value) / vScale;
          const ndt = dt * cos - dv * sin;
          const ndv = dt * sin + dv * cos;
          let nt = center.time + ndt * fScale;
          nt = Math.max(0, Math.min(totalFrames, snapToFrame ? Math.round(nt) : nt));
          const nvNum = center.value + ndv * vScale;
          const nv = typeof s.value === 'number' ? nvNum
            : Array.isArray(s.value) ? s.value.map((_v, i) => i === 0 ? nvNum : s.value[i]) : s.value;
          engine.updateKeyframe(id, { time: nt, value: nv });
        }
        showOverlay(`R  ${(angle * 180 / Math.PI).toFixed(1)}°`);
      }
      useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((t as HTMLInputElement).tagName === 'INPUT' || (t as HTMLTextAreaElement).tagName === 'TEXTAREA') return;
      const inGraph = !!(t.closest?.('[data-graph-editor="1"]') || (document.activeElement as HTMLElement)?.closest?.('[data-graph-editor="1"]'));
      const hoverInGraph = !!(document.querySelector('[data-graph-editor="1"]:hover'));
      if (!inGraph && !hoverInGraph) return;

      if (mode) {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(); return; }
        if (e.key === 'x' || e.key === 'X') { e.preventDefault(); axis = axis === 'x' ? null : 'x'; return; }
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); axis = axis === 'y' ? null : 'y'; return; }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let newMode: Mode = null;
      if (e.key === 'g' || e.key === 'G') newMode = 'grab';
      else if (e.key === 's' || e.key === 'S') newMode = 'scale';
      else if (e.key === 'r' || e.key === 'R') newMode = 'rotate';
      if (!newMode) return;
      const snap = takeSnapshot();
      if (!snap) return;
      e.preventDefault();
      snapshot = snap;
      mode = newMode;
      axis = null;
      start = { x: (window as any)._lastMouseX ?? window.innerWidth / 2, y: (window as any)._lastMouseY ?? window.innerHeight / 2 };
      showOverlay(newMode === 'grab' ? 'G' : newMode === 'scale' ? 'S' : 'R');
    };

    const onClickCommit = (e: MouseEvent) => { if (mode) { e.preventDefault(); e.stopPropagation(); commit(); } };
    const trackMouse = (e: MouseEvent) => { (window as any)._lastMouseX = e.clientX; (window as any)._lastMouseY = e.clientY; };

    document.addEventListener('mousemove', trackMouse);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onClickCommit, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearOverlay();
      document.removeEventListener('mousemove', trackMouse);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onClickCommit, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [svgRef, viewBox, snapToFrame, totalFrames]);
}