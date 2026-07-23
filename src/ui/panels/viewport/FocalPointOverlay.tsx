/**
 * FocalPointOverlay — draws a small crosshair marker at the Free View
 * camera's focal point (orbit pivot). Only visible in Free View.
 */
import React, { useState } from 'react';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import { useViewportStore } from '../../../state/viewportStore';
import { cameraController } from '../../../renderer/CameraController';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

export const FocalPointOverlay: React.FC<Props> = ({
  cameraManager,
  viewportSize,
}) => {
  const [, forceUpdate] = useState(0);
  const showFocal = useViewportStore((s) => s.settings.showFocalPoint);

  useCameraSubscribe(cameraManager, () => forceUpdate((n) => n + 1));

  if (!cameraManager || !showFocal) return null;
  if (!cameraController.isFreeView) return null;

  const f = cameraController.freeState.focal;
  const p = cameraManager.worldToScreenSafe(f.x, f.y, f.z);
  if (!p) return null;

  const { x, y } = p;
  if (
    x < -20 || y < -20 ||
    x > viewportSize.width + 20 ||
    y > viewportSize.height + 20
  ) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 27,
        overflow: 'visible',
      }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {/* Crosshair */}
      <line x1={x - 6} y1={y} x2={x + 6} y2={y}
        stroke="rgba(255,200,80,0.85)" strokeWidth={1.5}
        strokeLinecap="round" />
      <line x1={x} y1={y - 6} x2={x} y2={y + 6}
        stroke="rgba(255,200,80,0.85)" strokeWidth={1.5}
        strokeLinecap="round" />
      {/* Center dot */}
      <circle cx={x} cy={y} r={2.5}
        fill="rgba(255,200,80,1)"
        stroke="rgba(0,0,0,0.6)" strokeWidth={0.5} />
      {/* Outer ring */}
      <circle cx={x} cy={y} r={9}
        fill="none"
        stroke="rgba(255,200,80,0.35)"
        strokeWidth={0.8}
        strokeDasharray="2 3" />
    </svg>
  );
};

export default FocalPointOverlay;