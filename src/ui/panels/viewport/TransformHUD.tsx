/**
 * TransformHUD — on-screen display during modal transforms (I6).
 * Shows current delta/angle/scale values, axis constraints, and numeric input buffer.
 * Positioned at bottom-center of viewport, overlaid on canvas.
 * Style matches Blender's compact monospace transform info.
 */
import React, { useEffect, useState } from 'react';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { ModalTransform } from '../../../renderer/interaction/ModalTransform';
import type { TransformInfo } from '../../../renderer/interaction/ModalTransform';

interface TransformHUDProps {
  modalTransform: ModalTransform | null;
  cameraManager: CameraManager | null;
}

export const TransformHUD: React.FC<TransformHUDProps> = ({ modalTransform, cameraManager }) => {
  const [info, setInfo] = useState<TransformInfo>({
    mode: null, active: false,
    axisLock: null, axisExclude: null,
    deltaX: 0, deltaY: 0, rotation: 0,
    scaleX: 1, scaleY: 1,
    numericBuffer: '',
    precisionMode: false, snapMode: false,
  });

  useEffect(() => {
    if (!modalTransform) return;
    const cb = (newInfo: TransformInfo) => setInfo(newInfo);
    modalTransform.setOnStateChange(cb);
    return () => {
      // The callback will be cleaned up when ModalTransform is disposed
    };
  }, [modalTransform]);

  if (!info.active || !info.mode) return null;

  const { mode, axisLock, axisExclude, rotation, scaleX, scaleY, numericBuffer, precisionMode, snapMode } = info;
  const axisLabel = axisLock ? ` (${axisLock.toUpperCase()})`
                  : axisExclude ? ` (not ${axisExclude.toUpperCase()})`
                  : '';

  let label = '';
  let value = '';

  switch (mode) {
    case 'grab': {
      // Compute world-space delta from camera zoom
      const zoom = cameraManager?.zoom ?? 1;
      const dx = -(info.deltaX * zoom);
      const dy = info.deltaY * zoom;
      label = 'G';
      value = `ΔX ${dx.toFixed(1)}  ΔY ${dy.toFixed(1)}`;
      break;
    }
    case 'rotate':
      label = 'R';
      value = `${rotation.toFixed(1)}°`;
      break;
    case 'scale':
      label = 'S';
      value = `${(scaleX * 100).toFixed(1)}% × ${(scaleY * 100).toFixed(1)}%`;
      break;
  }

  const modifiers = [
    precisionMode ? 'PRECISION' : '',
    snapMode ? 'SNAP' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
      <div className="flex items-center gap-2 px-2 py-1 bg-[var(--color-bg-overlay,#1a1a1a)] border border-[var(--color-border,#333)] rounded-sm">
        <span className="font-mono text-[11px] text-[var(--color-accent)] font-bold">
          {label}
          {axisLabel}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-text-primary,#e6e6e6)]">
          {value}
        </span>
        {numericBuffer && (
          <span className="font-mono text-[11px] text-[#ffdd44]">
            [{numericBuffer}]
          </span>
        )}
        {modifiers && (
          <span className="font-mono text-[9px] text-[var(--color-text-secondary,#888)] ml-1">
            {modifiers}
          </span>
        )}
      </div>
    </div>
  );
};

export default TransformHUD;
