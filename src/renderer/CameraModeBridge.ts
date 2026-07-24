/**
 * CameraModeBridge — subscribes to composition store and rebinds the
 * CameraController whenever the active comp changes. Also re-applies the
 * chosen view mode on the renderer.
 */
import { useCompositionStore } from '../state/compositionStore';
import { cameraController } from './CameraController';

let unsub: (() => void) | null = null;

export function startCameraModeBridge(onModeChange: () => void): () => void {
  // Guard: clean up any previous bridge before starting a new one
  if (unsub) { unsub(); unsub = null; }

  // Initial bind
  const initId = useCompositionStore.getState().activeCompositionId;
  cameraController.bindComposition(initId);

  const modeUnsub = cameraController.onModeChange(() => onModeChange());

  let lastCompId = initId;
  unsub = useCompositionStore.subscribe((s) => {
    const id = s.activeCompositionId;
    if (id !== lastCompId) {
      lastCompId = id;
      cameraController.bindComposition(id);
      onModeChange();
    }
  });

  return () => {
    modeUnsub();
    unsub?.();
    unsub = null;
  };
}
