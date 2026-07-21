/**
 * Camera change event bus — allows multiple subscribers without overwriting onChanged.
 * Consumers (CompBoundsCSS, GradientOverlay, etc.) subscribe here instead of
 * monkey-patching cameraManager.onChanged, which breaks the renderer's own callback.
 *
 * Emits are RAF-throttled: rapid events during continuous drag (orbit/pan/zoom)
 * produce at most one batch of listener calls per animation frame, preventing
 * redundant React re-renders while maintaining frame-rate responsiveness.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let rafScheduled = false;

export function onCameraChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitCameraChange(): void {
  // RAF-throttle: coalesce all emits within the same animation frame
  // into a single batch of listener calls.
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      for (const l of listeners) {
        try { l(); } catch (e) { console.warn('[CameraEvents] listener threw:', e); }
      }
      rafScheduled = false;
    });
  }
}
