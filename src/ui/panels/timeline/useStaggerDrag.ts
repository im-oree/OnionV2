/**
 * useStaggerDrag — Ctrl+Alt drag in the timeline to procedurally stagger
 * multiple selected layers (or keyframes) by a per-item frame offset.
 *
 * Behaviour:
 * - Requires ≥2 items selected (keyframes take priority over layers).
 * - Hold Ctrl+Alt while mouse is inside timeline area → cursor becomes ew-resize
 *   and a HUD chip appears near the cursor.
 * - Left-mouse-down starts the drag. Selection ORDER is preserved from
 *   selectionStore.selected (order clicked).
 * - Drag right → positive stagger (item i moves by i * step frames).
 *   Drag left → negative stagger (reversed).
 * - Step size is round(dx / zoom / SENSITIVITY). A small factor keeps it
 *   feeling like AE's Quick Offset.
 * - Escape cancels and restores originals.
 * - On mouseup, one history snapshot is pushed ("Stagger Layers" /
 *   "Stagger Keyframes").
 */
import { useEffect, useRef, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { debouncedCapture, flushDebouncedSnapshot, cancelDebouncedSnapshot } from '../../../state/historyStore';

// Higher = slower, more precision. 1 = 1 screen pixel per frame per index step.
const SENSITIVITY = 3;

interface LayerSnap { id: string; startFrame: number; endFrame: number; }
interface KfSnap    { id: string; time: number; }

interface HudInfo {
  visible: boolean;
  x: number;
  y: number;
  step: number;
  count: number;
  target: 'layers' | 'keyframes';
}

export interface StaggerDragState {
  /** True whenever Ctrl+Alt is held AND enough items are selected to stagger. */
  armed: boolean;
  /** True during an active drag. */
  dragging: boolean;
  /** Info for the floating HUD chip. */
  hud: HudInfo;
}

interface Options {
  /** The scrollable tracks container ref (right side of timeline). */
  containerRef: React.RefObject<HTMLElement | null>;
  compId: string | null;
  zoom: number;
}

export function useStaggerDrag({ containerRef, compId, zoom }: Options): StaggerDragState {
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hud, setHud] = useState<HudInfo>({
    visible: false, x: 0, y: 0, step: 0, count: 0, target: 'layers',
  });

  // Refs for the active drag session (avoid re-renders every mousemove).
  const dragRef = useRef<{
    startX: number;
    layerSnaps: LayerSnap[] | null;
    kfSnaps: KfSnap[] | null;
    target: 'layers' | 'keyframes';
    totalFrames: number;
  } | null>(null);

  const modKeysRef = useRef({ ctrl: false, alt: false });
  const mousePosRef = useRef({ x: 0, y: 0, inside: false });

  // ── Determine what would be staggered given current selection ──
  const computeTarget = (): { kind: 'keyframes' | 'layers' | null; count: number } => {
    const kfCount = useKeyframeStore.getState().selectedKeyframeIds.size;
    if (kfCount >= 2) return { kind: 'keyframes', count: kfCount };
    const layerCount = useSelectionStore.getState().selected.filter(x => x.type === 'layer').length;
    if (layerCount >= 2) return { kind: 'layers', count: layerCount };
    return { kind: null, count: 0 };
  };

  // ── Global key + mouse tracking to arm/disarm ──
  useEffect(() => {
    const recomputeArmed = () => {
      if (!modKeysRef.current.ctrl || !modKeysRef.current.alt) {
        setArmed(false);
        setHud(h => (h.visible ? { ...h, visible: false } : h));
        return;
      }
      if (!mousePosRef.current.inside) {
        setArmed(false);
        setHud(h => (h.visible ? { ...h, visible: false } : h));
        return;
      }
      const t = computeTarget();
      if (!t.kind) {
        setArmed(false);
        setHud(h => (h.visible ? { ...h, visible: false } : h));
        return;
      }
      setArmed(true);
      setHud(h => ({
        ...h,
        visible: true,
        x: mousePosRef.current.x,
        y: mousePosRef.current.y,
        step: h.step,        // preserve last step while merely armed
        count: t.count,
        target: t.kind,
      }));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') modKeysRef.current.ctrl = true;
      if (e.key === 'Alt') modKeysRef.current.alt = true;
      recomputeArmed();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') modKeysRef.current.ctrl = false;
      if (e.key === 'Alt') modKeysRef.current.alt = false;
      recomputeArmed();
    };
    const onBlur = () => {
      modKeysRef.current.ctrl = false;
      modKeysRef.current.alt = false;
      recomputeArmed();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // ── Mouse tracking on the container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onEnter = () => { mousePosRef.current.inside = true; };
    const onLeave = () => {
      mousePosRef.current.inside = false;
      if (!dragging) {
        setArmed(false);
        setHud(h => (h.visible ? { ...h, visible: false } : h));
      }
    };
    const onMove = (ev: MouseEvent) => {
      mousePosRef.current.x = ev.clientX;
      mousePosRef.current.y = ev.clientY;
      if (armed || dragging) {
        setHud(h => (h.visible ? { ...h, x: ev.clientX, y: ev.clientY } : h));
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mousemove', onMove);
    };
  }, [containerRef, armed, dragging]);

  // ── Apply cursor when armed ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (armed || dragging) {
      (el as HTMLElement).style.cursor = 'ew-resize';
    } else {
      (el as HTMLElement).style.cursor = '';
    }
  }, [armed, dragging, containerRef]);

  // ── Attach mousedown handler on the container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !compId) return;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!modKeysRef.current.ctrl || !modKeysRef.current.alt) return;
      const t = computeTarget();
      if (!t.kind) return;

      // Only trigger from within the tracks area itself (not the toolbar strip).
      // The container we're attached to IS the tracks area, so this is fine.
      e.preventDefault();
      e.stopPropagation();

      const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
      if (!comp) return;
      const totalFrames = Math.floor(comp.duration * comp.fps);

      let layerSnaps: LayerSnap[] | null = null;
      let kfSnaps: KfSnap[] | null = null;

      if (t.kind === 'keyframes') {
        // Preserve selection order via engine iteration order combined with
        // selectedKeyframeIds set. We sort by time so keyframes are staggered
        // in playhead-order (matches user expectation better than click order
        // for keyframes across many properties).
        const engine = useKeyframeStore.getState().engine;
        const selSet = useKeyframeStore.getState().selectedKeyframeIds;
        const all: KfSnap[] = [];
        // Iterate every layer/property to find selected keyframes
        const data: Map<string, Map<string, any[]>> = (engine as any)._data;
        for (const [, propMap] of data) {
          for (const [, kfs] of propMap) {
            for (const k of kfs) {
              if (selSet.has(k.id)) all.push({ id: k.id, time: k.time });
            }
          }
        }
        all.sort((a, b) => a.time - b.time);
        kfSnaps = all;
        if (kfSnaps.length < 2) return;
      } else {
        // Layers: use selection ORDER from selectionStore.selected (click order).
        const selected = useSelectionStore.getState().selected
          .filter(x => x.type === 'layer' && x.compositionId === compId);
        const seen = new Set<string>();
        const ordered: LayerSnap[] = [];
        for (const s of selected) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          const l = comp.layers.find(ll => ll.id === s.id);
          if (l) ordered.push({ id: l.id, startFrame: l.startFrame, endFrame: l.endFrame });
        }
        layerSnaps = ordered;
        if (layerSnaps.length < 2) return;
      }

      dragRef.current = {
        startX: e.clientX,
        layerSnaps,
        kfSnaps,
        target: t.kind,
        totalFrames,
      };
      setDragging(true);

      debouncedCapture(t.kind === 'keyframes' ? 'Stagger Keyframes' : 'Stagger Layers');

      const onMove = (ev: MouseEvent) => {
        const st = dragRef.current;
        if (!st) return;
        const dxPx = ev.clientX - st.startX;
        const rawFrames = dxPx / zoom / SENSITIVITY;
        const step = Math.round(rawFrames);

        setHud(h => ({ ...h, x: ev.clientX, y: ev.clientY, step, visible: true }));

        applyStagger(compId, st, step);
      };

      const cancel = (restore: boolean) => {
        const st = dragRef.current;
        if (!st) return;
        if (restore) {
          applyStagger(compId, st, 0);
          cancelDebouncedSnapshot();
        } else {
          flushDebouncedSnapshot();
        }
        dragRef.current = null;
        setDragging(false);
        setHud(h => ({ ...h, visible: false }));
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('keydown', onEsc, true);
      };
      const onUp = () => cancel(false);
      const onEsc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.preventDefault(); cancel(true); } };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('keydown', onEsc, true);
    };

    el.addEventListener('mousedown', onDown, true /* capture — fire before layer bar drag */);
    return () => el.removeEventListener('mousedown', onDown, true);
  }, [containerRef, compId, zoom]);

  return { armed, dragging, hud };
}

// ─────────────────────────────────────────────────────────────
// Pure apply
// ─────────────────────────────────────────────────────────────
function applyStagger(
  compId: string,
  st: NonNullable<ReturnType<typeof useStaggerDrag>['_' & any]> & any,
  step: number,
): void {
  const cs = useCompositionStore.getState();
  const totalFrames: number = st.totalFrames;

  if (st.target === 'layers' && st.layerSnaps) {
    for (let i = 0; i < st.layerSnaps.length; i++) {
      const snap: LayerSnap = st.layerSnaps[i];
      const dur = snap.endFrame - snap.startFrame;
      let ns = snap.startFrame + i * step;
      if (ns < 0) ns = 0;
      if (ns + dur > totalFrames) ns = totalFrames - dur;
      if (ns < 0) ns = 0;
      cs.updateLayer(compId, snap.id, { startFrame: ns, endFrame: ns + dur }, true);
    }
    // Also shift each layer's keyframes with it so animations move together.
    const kfStore = useKeyframeStore.getState();
    const engine = kfStore.engine;
    for (let i = 0; i < st.layerSnaps.length; i++) {
      const snap: LayerSnap = st.layerSnaps[i];
      const delta = i * step; // absolute shift from original
      const kfs = engine.getAllKeyframesForLayer(snap.id);
      if (kfs.length === 0) continue;
      // We stashed nothing per-keyframe — the layer's own startFrame moves with
      // it so keyframes remain visually locked to their layer bar. If you also
      // want keyframe.time to travel with the layer, uncomment below:
      // for (const k of kfs) engine.updateKeyframe(k.id, { time: k.time + delta });
      void delta;
    }
    useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
  } else if (st.target === 'keyframes' && st.kfSnaps) {
    const engine = useKeyframeStore.getState().engine;
    for (let i = 0; i < st.kfSnaps.length; i++) {
      const snap: KfSnap = st.kfSnaps[i];
      const nt = Math.max(0, snap.time + i * step);
      engine.updateKeyframe(snap.id, { time: nt });
    }
    useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
  }
}