import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import type { CameraManager } from '../../../renderer/CameraManager';

interface RulersProps {
  zoom: number;
  viewportSize: { width: number; height: number };
  cameraManager?: CameraManager | null;
}

export const Rulers: React.FC<RulersProps> = ({ zoom, viewportSize, cameraManager }) => {
  const comp = useCompositionStore((s) => s.activeCompositionId ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  if (!comp) return null;

  const rulerSize = 20;
  const panX = cameraManager?.panX ?? 0;
  const panY = cameraManager?.panY ?? 0;
  const compCenterScreenX = viewportSize.width / 2 + panX / zoom;
  const compCenterScreenY = viewportSize.height / 2 - panY / zoom;

  const rawStep = 10 * zoom;
  const step = rawStep < 5 ? 5 : rawStep < 10 ? 10 : rawStep < 25 ? 25 : rawStep < 50 ? 50 : rawStep < 100 ? 100 : 500;
  const majorStep = step * 10;

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
    const screenY = compCenterScreenY + (py - comp.height / 2) * (1 / zoom);
    if (screenY < -50 || screenY > viewportSize.height + 50) continue;
    vTicks.push({ y: screenY, label: isMajor ? String(py) : '', isMajor });
  }
  const maxTicks = 500;
  if (hTicks.length > maxTicks || vTicks.length > maxTicks) return null;

  const tickColor = 'rgba(255,255,255,0.28)';
  const labelColor = 'rgba(255,255,255,0.36)';
  const bgColor = 'rgba(20,22,27,0.85)';

  return (
    <>
      <svg className="absolute top-0 left-0 pointer-events-none" width={viewportSize.width} height={rulerSize} style={{ zIndex: 30 }}>
        <rect width={viewportSize.width} height={rulerSize} fill={bgColor} />
        {hTicks.map((tick, i) => (
          <g key={`h-${i}`}>
            <line x1={tick.x} y1={tick.isMajor ? 4 : rulerSize - 5} x2={tick.x} y2={rulerSize}
              stroke={tickColor} strokeWidth={tick.isMajor ? 1 : 0.6} />
            {tick.label && (
              <text x={tick.x + 3} y={rulerSize - 4} fill={labelColor} fontSize={9} fontFamily="var(--font-family-mono)">
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <svg className="absolute top-0 left-0 pointer-events-none" width={rulerSize} height={viewportSize.height} style={{ zIndex: 30 }}>
        <rect width={rulerSize} height={viewportSize.height} fill={bgColor} />
        {vTicks.map((tick, i) => (
          <g key={`v-${i}`}>
            <line x1={tick.isMajor ? 4 : rulerSize - 5} y1={tick.y} x2={rulerSize} y2={tick.y}
              stroke={tickColor} strokeWidth={tick.isMajor ? 1 : 0.6} />
            {tick.label && (
              <text x={3} y={tick.y + 9} fill={labelColor} fontSize={9} fontFamily="var(--font-family-mono)">
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="absolute top-0 left-0" style={{ width: rulerSize, height: rulerSize, background: bgColor, zIndex: 31 }} />
    </>
  );
};