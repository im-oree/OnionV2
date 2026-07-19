/**
 * Camera change event bus — allows multiple subscribers without overwriting onChanged.
 * Consumers (CompBoundsCSS, GradientOverlay, etc.) subscribe here instead of
 * monkey-patching cameraManager.onChanged, which breaks the renderer's own callback.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function onCameraChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitCameraChange(): void {
  for (const l of listeners) {
    try { l(); } catch (e) { console.warn('[CameraEvents] listener threw:', e); }
  }
}
