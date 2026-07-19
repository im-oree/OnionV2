import { useEffect } from 'react';
import type { CameraManager } from '../../../../renderer/CameraManager';

/**
 * Subscribe to camera changes without overwriting the primary onChanged callback.
 * Wraps the existing callback with a chain — safe for multiple consumers.
 */
export function useCameraSubscribe(
  cameraManager: CameraManager | null,
  callback: () => void,
): void {
  useEffect(() => {
    if (!cameraManager) return;
    const prev = cameraManager.onChanged;
    cameraManager.onChanged = () => {
      prev?.();
      callback();
    };
    return () => {
      cameraManager.onChanged = prev;
    };
  }, [cameraManager, callback]);
}