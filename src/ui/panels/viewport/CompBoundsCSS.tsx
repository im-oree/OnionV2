import React, { useState, useCallback } from 'react';
import type { Composition } from '../../../types/composition';
import type { CameraManager } from '../../../renderer/CameraManager';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';

interface Props {
  comp: Composition;
  viewportSize: { width: number; height: number };
  cameraManager: CameraManager | null;
  zoom: number;
}

export const CompBoundsCSS: React.FC<Props> = ({ comp, viewportSize, cameraManager, zoom }) => {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => (n + 1) % 1e9), []);
  useCameraSubscribe(cameraManager, rerender);

  // Also re-render when comp background changes
  void comp.backgroundColor;

  const showBounds = cameraManager && viewportSize.width > 0 && viewportSize.height > 0;

  let x = 0, y = 0, w = 0, h = 0;
  if (showBounds && cameraManager) {
    try {
      const halfW = comp.width / 2;
      const halfH = comp.height / 2;
      const tl = cameraManager.worldToScreen(-halfW,  halfH);
      const br = cameraManager.worldToScreen( halfW, -halfH);
      x = tl.x; y = tl.y;
      w = br.x - tl.x; h = br.y - tl.y;
    } catch {
      // Camera not ready yet — bounds will show on next camera change
    }
  }

  const isEmpty = !comp.backgroundColor
    || comp.backgroundColor.toLowerCase() === '#000000'
    || comp.backgroundColor.toLowerCase() === '#000';
  const effectiveBg = isEmpty ? 'var(--viewport-bg)' : comp.backgroundColor;

  void zoom;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0, background: 'var(--color-app-bg)' }}
    >
      {w > 0 && h > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x, top: y, width: w, height: h,
            background: effectiveBg,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(88,101,255,0.35)',
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
};