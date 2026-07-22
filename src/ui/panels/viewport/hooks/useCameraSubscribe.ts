import { useEffect, useRef } from 'react';
import type { CameraManager } from '../../../../renderer/CameraManager';
import { onCameraChange } from '../../../../renderer/utils/CameraEvents';

/**
 * Subscribe to camera changes safely via pub/sub bus.
 * Multiple consumers can subscribe without stomping on each other or on the
 * renderer's own onChanged callback.
 *
 * Uses a ref to store the callback so the subscription effect depends only
 * on the cameraManager reference — not on a potentially-recreated callback
 * (e.g. an inline arrow), which would cause an infinite re-render loop.
 */
export function useCameraSubscribe(
  cameraManager: CameraManager | null,
  callback: () => void,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!cameraManager) return;
    const unsub = onCameraChange(() => cbRef.current?.());
    // Fire once on mount to sync initial state
    cbRef.current?.();
    return unsub;
  }, [cameraManager]);
}
