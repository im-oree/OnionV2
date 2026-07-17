/**
 * Rulers — pixel measurement rulers at the top and left edges of the viewport.
 * Shows tick marks and numbers based on composition dimensions and zoom.
 */
import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';

interface RulersProps {
  zoom: number;
  viewportSize: { width: number; height: number };
  /** Ruler thickness in pixels */
  rulerSize?: number;
}

export const Rulers: React.FC<RulersProps> = ({
  zoom,
  viewportSize,
  rulerSize = 20,
}) => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  if (!comp) return null;

  const step = Math.max(10, Math.round(50 * zoom));
  const scale = Math.min(
    viewportSize.width / comp.width,
    viewportSize.height / comp.height,
  );
  const offsetX = (viewportSize.width - comp.width * scale) / 2;
  const offsetY = (viewportSize.height - comp.height * scale) / 2;

  // Generate horizontal ruler ticks
  const hTicks: Array<{ x: number; label: string; isMajor: boolean }> = [];
  for (let px = 0; px <= comp.width; px += step) {
    const isMajor = px % (step * 5) === 0;
    hTicks.push({
      x: offsetX + px * scale,
      label: isMajor ? String(px) : '',
      isMajor,
    });
  }

  // Generate vertical ruler ticks
  const vTicks: Array<{ y: number; label: string; isMajor: boolean }> = [];
  for (let py = 0; py <= comp.height; py += step) {
    const isMajor = py % (step * 5) === 0;
    vTicks.push({
      y: offsetY + py * scale,
      label: isMajor ? String(py) : '',
      isMajor,
    });
  }

  // Limit ticks to avoid performance issues with very small zoom
  const maxTicks = 500;
  if (hTicks.length > maxTicks || vTicks.length > maxTicks) {
    return null; // Too zoomed out to show rulers
  }

  return (
    <>
      {/* Horizontal ruler (top) */}
      <svg
        className="absolute top-0 left-0 pointer-events-none z-30"
        width={viewportSize.width}
        height={rulerSize}
      >
        <rect width={viewportSize.width} height={rulerSize} fill="var(--color-bg-surface)" />
        {hTicks.map((tick, i) => (
          <g key={`h-${i}`}>
            <line
              x1={tick.x}
              y1={tick.isMajor ? 0 : rulerSize - 6}
              x2={tick.x}
              y2={rulerSize}
              stroke="var(--color-text-disabled)"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.label && (
              <text
                x={tick.x + 3}
                y={rulerSize - 4}
                fill="var(--color-text-disabled)"
                fontSize={9}
                fontFamily="monospace"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Vertical ruler (left) */}
      <svg
        className="absolute top-0 left-0 pointer-events-none z-30"
        width={rulerSize}
        height={viewportSize.height}
        style={{ clipPath: 'inset(20px 0 0 0)' }}
      >
        <rect width={rulerSize} height={viewportSize.height} fill="var(--color-bg-surface)" />
        {vTicks.map((tick, i) => (
          <g key={`v-${i}`}>
            <line
              x1={tick.isMajor ? 0 : rulerSize - 6}
              y1={tick.y}
              x2={rulerSize}
              y2={tick.y}
              stroke="var(--color-text-disabled)"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.label && (
              <text
                x={3}
                y={tick.y + 10}
                fill="var(--color-text-disabled)"
                fontSize={9}
                fontFamily="monospace"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Corner square */}
      <div
        className="absolute top-0 left-0 z-30 pointer-events-none"
        style={{
          width: rulerSize,
          height: rulerSize,
          background: 'var(--color-bg-surface)',
        }}
      />
    </>
  );
};
