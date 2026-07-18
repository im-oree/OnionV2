/**
 * Rulers — pixel measurement rulers at the top and left edges of the viewport.
 * Shows tick marks and numbers relative to composition origin (0,0 at center).
 * Ticks account for camera pan and zoom.
 * A5 fix: measurements are comp-relative, not arbitrary world coords.
 */
import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import type { CameraManager } from '../../../renderer/CameraManager';

interface RulersProps {
  zoom: number;
  viewportSize: { width: number; height: number };
  cameraManager?: CameraManager | null;
}

export const Rulers: React.FC<RulersProps> = ({ zoom, viewportSize, cameraManager }) => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  if (!comp) return null;

  const rulerSize = 18;

  // Camera pan offset in screen pixels
  const panX = cameraManager?.panX ?? 0;
  const panY = cameraManager?.panY ?? 0;

  // Calculate where comp center maps to in screen space
  const compCenterScreenX = viewportSize.width / 2 + panX / zoom;
  const compCenterScreenY = viewportSize.height / 2 - panY / zoom;

  // Adaptive step
  const rawStep = 10 * zoom;
  const step = rawStep < 5 ? 5 : rawStep < 10 ? 10 : rawStep < 25 ? 25 : rawStep < 50 ? 50 : rawStep < 100 ? 100 : 500;
  const majorStep = step * 10;

  // Generate ticks from comp start (0) to comp end, mapped to screen coords
  const hTicks: Array<{ x: number; label: string; isMajor: boolean }> = [];
  for (let px = 0; px <= comp.width; px += step) {
    const isMajor = px % majorStep === 0 || px === 0 || px === comp.width;
    const screenX = compCenterScreenX + (px - comp.width / 2) * (1 / zoom);
    if (screenX < -50 || screenX > viewportSize.width + 50) continue;
    hTicks.push({ x: screenX, label: isMajor ? String(px) : '', isMajor });
  }

  const vTicks: Array<{ y: number; label: string; isMajor: boolean }> = [];
  for (let py = 0; py <= comp.height; py += step) {
    const isMajor = py % majorStep === 0 || py === 0 || py === comp.height;
    // Y-up: comp bottom = 0, comp top = height
    const screenY = compCenterScreenY + (py - comp.height / 2) * (1 / zoom);
    if (screenY < -50 || screenY > viewportSize.height + 50) continue;
    vTicks.push({ y: screenY, label: isMajor ? String(py) : '', isMajor });
  }

  const maxTicks = 500;
  if (hTicks.length > maxTicks || vTicks.length > maxTicks) return null;

  const tickColor = 'var(--color-text-disabled)';
  const bgColor = 'var(--color-bg-panel-header)';

  return (
    <>
      {/* Horizontal ruler (top) */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={viewportSize.width}
        height={rulerSize}
        style={{ zIndex: 30 }}
      >
        <rect width={viewportSize.width} height={rulerSize} fill={bgColor} />
        {hTicks.map((tick, i) => (
          <g key={`h-${i}`}>
            <line
              x1={tick.x} y1={tick.isMajor ? 0 : rulerSize - 5}
              x2={tick.x} y2={rulerSize}
              stroke={tickColor}
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.label && (
              <text
                x={tick.x + 2} y={rulerSize - 3}
                fill={tickColor}
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Vertical ruler (left) */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={rulerSize}
        height={viewportSize.height}
        style={{ zIndex: 30 }}
      >
        <rect width={rulerSize} height={viewportSize.height} fill={bgColor} />
        {vTicks.map((tick, i) => (
          <g key={`v-${i}`}>
            <line
              x1={tick.isMajor ? 0 : rulerSize - 5} y1={tick.y}
              x2={rulerSize} y2={tick.y}
              stroke={tickColor}
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.label && (
              <text
                x={2} y={tick.y + 9}
                fill={tickColor}
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Corner square */}
      <div
        className="absolute top-0 left-0"
        style={{ width: rulerSize, height: rulerSize, background: bgColor, zIndex: 31 }}
      />
    </>
  );
};
