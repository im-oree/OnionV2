/**
 * SnapGuidesOverlay — draws snap guide lines during a modal transform.
 *
 * Reads from ModalTransform.lastSnapLines every animation frame. Lines are
 * in world coordinates, so we convert to screen coords with the camera.
 * Only visible while the modal transform is active AND snapped.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { ModalTransform } from '../../../renderer/interaction/ModalTransform';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props {
  modalTransform: ModalTransform | null;
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

interface DrawLine {
  type: 'horizontal' | 'vertical';
  screenPos: number;
}

const COLOR = 'var(--color-accent, #E27AF7)';
const DASH = '4 3';

export const SnapGuidesOverlay: React.FC<Props> = ({
  modalTransform,
  cameraManager,
  viewportSize,
}) => {
  const rafRef = useRef<number | null>(null);
  const linesRef = useRef<DrawLine[]>([]);
  const [lines, setLines] = useState<DrawLine[]>([]);

  useEffect(() => {
    if (!modalTransform || !cameraManager) return;

    const tick = () => {
      const mt = modalTransform;
      if (!mt.active || !mt.lastSnapLines || mt.lastSnapLines.length === 0) {
        if (linesRef.current.length !== 0) {
          linesRef.current = [];
          setLines([]);
        }
      } else {
        const out: DrawLine[] = [];
        for (const l of mt.lastSnapLines) {
          if (l.type === 'vertical') {
            const s = cameraManager.worldToScreen(l.position, 0);
            out.push({ type: 'vertical', screenPos: s.x });
          } else {
            const s = cameraManager.worldToScreen(0, l.position);
            out.push({ type: 'horizontal', screenPos: s.y });
          }
        }
        // Only setState if the values actually changed to avoid churn.
        const old = linesRef.current;
        let changed = out.length !== old.length;
        if (!changed) {
          for (let i = 0; i < out.length; i++) {
            if (
              out[i].type !== old[i].type ||
              Math.abs(out[i].screenPos - old[i].screenPos) > 0.5
            ) {
              changed = true;
              break;
            }
          }
        }
        if (changed) {
          linesRef.current = out;
          setLines(out);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [modalTransform, cameraManager]);

  if (!lines.length || viewportSize.width === 0 || viewportSize.height === 0) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 26, width: '100%', height: '100%' }}
    >
      {lines.map((l, i) =>
        l.type === 'vertical' ? (
          <g key={i}>
            <line
              x1={l.screenPos}
              y1={0}
              x2={l.screenPos}
              y2={viewportSize.height}
              stroke={COLOR}
              strokeWidth={1}
              strokeDasharray={DASH}
              opacity={0.9}
            />
            {/* Center hit-marker */}
            <circle
              cx={l.screenPos}
              cy={viewportSize.height / 2}
              r={2.5}
              fill={COLOR}
            />
          </g>
        ) : (
          <g key={i}>
            <line
              x1={0}
              y1={l.screenPos}
              x2={viewportSize.width}
              y2={l.screenPos}
              stroke={COLOR}
              strokeWidth={1}
              strokeDasharray={DASH}
              opacity={0.9}
            />
            <circle
              cx={viewportSize.width / 2}
              cy={l.screenPos}
              r={2.5}
              fill={COLOR}
            />
          </g>
        ),
      )}
    </svg>
  );
};

export default SnapGuidesOverlay;
