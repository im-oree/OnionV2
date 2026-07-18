import { useEffect, useRef } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { animationClock } from './PlaybackControls';

type Mode = 'grab' | 'scale' | null;

interface Snapshot { kfId: string; layerId: string; originalTime: number; }

/**
 * Global modal transform for selected keyframes.
 * G = grab (translate in time)
 * S = scale around playhead
 * Escape = cancel, Enter/click = confirm
 */
export function useKeyframeModal(zoom: number, totalFrames: number): void {
  const active = useRef(false);
  const mode = useRef<Mode>(null);
  const startMouseX = useRef(0);
  const currentMouseX = useRef(0);
  const snapshots = useRef<Snapshot[]>([]);
  const pivotFrame = useRef(0);

  useEffect(() => {
    const cancel = () => {
      if (!active.current) return;
      // Restore originals
      const store = useKeyframeStore.getState();
      for (const s of snapshots.current) {
        store.engine.updateKeyframe(s.kfId, { time: s.originalTime });
      }
      // Bump revision
      useKeyframeStore.setState(st => ({ revision: st.revision + 1 }));
      cleanup();
    };

    const confirm = () => {
      if (!active.current) return;
      cleanup();
    };

    const cleanup = () => {
      active.current = false;
      mode.current = null;
      snapshots.current = [];
      document.body.style.cursor = '';
    };

    const takeSnapshot = () => {
      const store = useKeyframeStore.getState();
      const selectedIds = store.selectedKeyframeIds;
      if (selectedIds.size === 0) return false;
      const shots: Snapshot[] = [];
      // We need to walk engine data to find each keyframe by id — do a linear search
      // (fine for typical selection sizes)
      for (const id of selectedIds) {
        const kf = findKeyframeById(store.engine as any, id);
        if (kf) shots.push({ kfId: id, layerId: kf.layerId, originalTime: kf.time });
      }
      snapshots.current = shots;
      return shots.length > 0;
    };

    const startMode = (m: Mode) => {
      if (!takeSnapshot()) return;
      active.current = true;
      mode.current = m;
      startMouseX.current = (document as any)._lastMouseEvent?.clientX ?? 0;
      currentMouseX.current = startMouseX.current;
      pivotFrame.current = Math.round(animationClock.currentFrame);
      document.body.style.cursor = m === 'grab' ? 'ew-resize' : 'ns-resize';
    };

    const apply = () => {
      if (!active.current || !mode.current) return;
      const store = useKeyframeStore.getState();
      const snapping = useTimelineStore.getState().snapping;
      const dxPx = currentMouseX.current - startMouseX.current;

      if (mode.current === 'grab') {
        // Time offset in frames
        const dFrames = Math.round(dxPx / zoom);
        for (const s of snapshots.current) {
          let newTime = s.originalTime + dFrames;
          newTime = Math.max(0, Math.min(totalFrames, newTime));
          if (snapping) newTime = Math.round(newTime);
          store.engine.updateKeyframe(s.kfId, { time: newTime });
        }
      } else if (mode.current === 'scale') {
        // Scale factor from mouse X delta relative to a "unit distance" of 200px
        const scale = 1 + dxPx / 200;
        const pivot = pivotFrame.current;
        for (const s of snapshots.current) {
          let newTime = pivot + (s.originalTime - pivot) * scale;
          newTime = Math.max(0, Math.min(totalFrames, newTime));
          if (snapping) newTime = Math.round(newTime);
          store.engine.updateKeyframe(s.kfId, { time: newTime });
        }
      }
      useKeyframeStore.setState(st => ({ revision: st.revision + 1 }));
    };

    const onMouseMove = (e: MouseEvent) => {
      (document as any)._lastMouseEvent = e;
      if (!active.current) return;
      currentMouseX.current = e.clientX;
      apply();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!active.current) return;
      if (e.button === 0) { e.preventDefault(); e.stopPropagation(); confirm(); }
      else if (e.button === 2) { e.preventDefault(); e.stopPropagation(); cancel(); }
    };

    const onKey = (e: KeyboardEvent) => {
      // While modal is active
      if (active.current) {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
        if (e.key === 'Enter') { e.preventDefault(); confirm(); return; }
        return;
      }
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Only trigger if there are selected keyframes AND cursor is over the timeline area
      const t = e.target as HTMLElement;
      const inTimeline = t.closest?.('[data-timeline-tracks="1"]');
      if (!inTimeline && !(document as any)._lastMouseInTimeline) return;
      if (useKeyframeStore.getState().selectedKeyframeIds.size === 0) return;

      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); startMode('grab'); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); startMode('scale'); }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKey);
      cleanup();
    };
  }, [zoom, totalFrames]);
}

/** Helper to find a keyframe by id by walking the engine's internal data */
function findKeyframeById(engine: any, id: string): { layerId: string; time: number } | null {
  const data: Map<string, Map<string, any[]>> = engine._data;
  for (const [layerId, propMap] of data) {
    for (const [, arr] of propMap) {
      for (const k of arr) if (k.id === id) return { layerId, time: k.time };
    }
  }
  return null;
}