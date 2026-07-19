import { useEffect } from 'react';
import type { CameraManager } from '../../../../renderer/CameraManager';
import { onCameraChange } from '../../../../renderer/utils/CameraEvents';

/**
 * Subscribe to camera changes safely via pub/sub bus.
 * Multiple consumers can subscribe without stomping on each other or on the
 * renderer's own onChanged callback.
 */
export function useCameraSubscribe(
  cameraManager: CameraManager | null,
  callback: () => void,
): void {
  useEffect(() => {
    if (!cameraManager) return;
    const unsub = onCameraChange(callback);
    // Fire once on mount to sync initial state
    callback();
    return unsub;
  }, [cameraManager, callback]);
}
