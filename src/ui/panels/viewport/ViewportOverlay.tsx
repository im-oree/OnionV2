/**
 * ViewportOverlay — SVG overlay for grid lines, guides, and crosshair.
 * Positioned absolutely on top of the Three.js canvas.
 * Uses the composition dimensions and camera zoom to draw the grid.
 */
import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';

interface ViewportOverlayProps {
  /** Current zoom level from camera (affects grid density) */
  zoom: number;
  /** Pixel dimensions of the viewport container */
  viewportSize: { width: number; height: number };
}

export const ViewportOverlay: React.FC<ViewportOverlayProps> = ({
  zoom,
  viewportSize,
}) => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  if (!comp) return null;

  const gridStep = Math.max(10, Math.round(50 * zoom));

  // Calculate scale to fit comp in viewport
  const scale = Math.min(
    viewportSize.width / comp.width,
    viewportSize.height / comp.height,
  );

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={viewportSize.width}
      height={viewportSize.height}
      viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
    >
      <defs>
        <pattern
          id="grid-minor"
          width={gridStep * scale}
          height={gridStep * scale}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridStep * scale} 0 L 0 0 0 ${gridStep * scale}`}
            fill="none"
            stroke="var(--viewport-grid)"
            strokeWidth={1 / (zoom || 1)}
          />
        </pattern>
        <pattern
          id="grid-major"
          width={gridStep * scale * 5}
          height={gridStep * scale * 5}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={gridStep * scale * 5}
            height={gridStep * scale * 5}
            fill="url(#grid-minor)"
          />
          <path
            d={`M ${gridStep * scale * 5} 0 L 0 0 0 ${gridStep * scale * 5}`}
            fill="none"
            stroke="var(--viewport-grid-major)"
            strokeWidth={1.5 / (zoom || 1)}
          />
        </pattern>
      </defs>

      {/* Composition bounds */}
      <rect
        x={(viewportSize.width - comp.width * scale) / 2}
        y={(viewportSize.height - comp.height * scale) / 2}
        width={comp.width * scale}
        height={comp.height * scale}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Grid fill */}
      <rect
        x={(viewportSize.width - comp.width * scale) / 2}
        y={(viewportSize.height - comp.height * scale) / 2}
        width={comp.width * scale}
        height={comp.height * scale}
        fill="url(#grid-major)"
      />

      {/* Center crosshair */}
      <line
        x1={viewportSize.width / 2 - 20}
        y1={viewportSize.height / 2}
        x2={viewportSize.width / 2 + 20}
        y2={viewportSize.height / 2}
        stroke="var(--viewport-crosshair)"
        strokeWidth={1}
      />
      <line
        x1={viewportSize.width / 2}
        y1={viewportSize.height / 2 - 20}
        x2={viewportSize.width / 2}
        y2={viewportSize.height / 2 + 20}
        stroke="var(--viewport-crosshair)"
        strokeWidth={1}
      />
      {/* Center dot */}
      <circle
        cx={viewportSize.width / 2}
        cy={viewportSize.height / 2}
        r={2}
        fill="var(--viewport-crosshair)"
      />
    </svg>
  );
};
