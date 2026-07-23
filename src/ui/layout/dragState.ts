/**
 * dragState — singleton tracking the currently-dragged tab.
 * Used by DropOverlay to know what's being dragged and where.
 */

interface DragState {
  activeInstanceId: string | null;
  onEnd: (() => void) | null;
}

const state: DragState = {
  activeInstanceId: null,
  onEnd: null,
};

const listeners = new Set<() => void>();

export function subscribeDrag(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function startDrag(instanceId: string, onEnd?: () => void): void {
  state.activeInstanceId = instanceId;
  state.onEnd = onEnd ?? null;
  notify();
}

export function endDrag(): void {
  const cb = state.onEnd;
  state.activeInstanceId = null;
  state.onEnd = null;
  notify();
  cb?.();
}

export function getDragInstanceId(): string | null {
  return state.activeInstanceId;
}