/**
 * ViewportOverlay — SVG overlay for grid, composition bounds, and crosshair.
 * Renders on top of the Three.js canvas, clipped to the composition area.
 *
 * This is the GRID overlay only — composition bounds background/outline is
 * handled by CompBoundsCSS. This component draws:
 * - Adaptive grid (minor + major lines) inside composition area
 * - Center crosshair with subtle dot
 * - Composition corner markers
 */
import React, { useMemo, useId } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';

interface ViewportOverlayProps {
  zoom: number;
  viewportSize: { width: number; height: number };
}

// ── Nice step computation (1-2-5 sequence) ───────────────────

function niceStep(raw: number): number {
  if (raw <= 0) return 50;

  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;

  let nice: number;
  if (normalized < 1.5) nice = 1;
  else if (normalized < 3.5) nice = 2;
  else if (normalized < 7.5) nice = 5;
  else nice = 10;

  return Math.max(5, nice * magnitude);
}

// ── Main component ──────────────────────────────────────────

export const ViewportOverlay: React.FC<ViewportOverlayProps> = ({
  zoom,
  viewportSize,
}) => {
  const minorPatternId = useId();
  const majorPatternId = useId();
  const clipId = useId();

  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id
      ? (s.compositions.find((c) => c.id === id) ?? null)
      : null;
  });

  const showGrid = useViewportStore((s) => s.settings.showGrid);

  // Compute grid geometry
  const grid = useMemo(() => {
    if (!comp) return null;

    const vw = viewportSize.width;
    const vh = viewportSize.height;
    if (vw <= 0 || vh <= 0) return null;
    if (comp.width <= 0 || comp.height <= 0) return null;

    const safeZoom = Math.max(0.01, zoom);

    // Scale to fit composition in viewport
    const scale = Math.min(vw / comp.width, vh / comp.height);

    // Composition rect in viewport coords
    const compW = comp.width * scale;
    const compH = comp.height * scale;
    const compX = (vw - compW) / 2;
    const compY = (vh - compH) / 2;

    // Target ~25-40px screen spacing for minor grid
    const targetScreenPx = 32;
    const rawStep = targetScreenPx / (scale * safeZoom);
    const minorStep = niceStep(rawStep);
    const majorStep = minorStep * 5;

    // Step sizes in screen pixels
    const minorPx = minorStep * scale;
    const majorPx = majorStep * scale;

    // Grid line stroke widths (scale with zoom for crispness)
    const minorStroke = Math.max(0.3, Math.min(0.8, 0.5 / safeZoom));
    const majorStroke = Math.max(0.5, Math.min(1.2, 0.8 / safeZoom));

    return {
      compX,
      compY,
      compW,
      compH,
      minorPx,
      majorPx,
      minorStroke,
      majorStroke,
      cx: vw / 2,
      cy: vh / 2,
    };
  }, [
    comp?.width,
    comp?.height,
    viewportSize.width,
    viewportSize.height,
    zoom,
    comp,
  ]);

  if (!comp || !grid) return null;

  const {
    compX, compY, compW, compH,
    minorPx, majorPx,
    minorStroke, majorStroke,
    cx, cy,
  } = grid;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
      width={viewportSize.width}
      height={viewportSize.height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {showGrid && minorPx > 3 && (
        <>
          <defs>
            {/* Minor grid pattern */}
            <pattern
              id={minorPatternId}
              width={minorPx}
              height={minorPx}
              patternUnits="userSpaceOnUse"
              x={compX}
              y={compY}
            >
              <line
                x1={minorPx}
                y1={0}
                x2={minorPx}
                y2={minorPx}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={minorStroke}
              />
              <line
                x1={0}
                y1={minorPx}
                x2={minorPx}
                y2={minorPx}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={minorStroke}
              />
            </pattern>

            {/* Major grid pattern */}
            <pattern
              id={majorPatternId}
              width={majorPx}
              height={majorPx}
              patternUnits="userSpaceOnUse"
              x={compX}
              y={compY}
            >
              <rect
                width={majorPx}
                height={majorPx}
                fill={`url(#${minorPatternId})`}
              />
              <line
                x1={majorPx}
                y1={0}
                x2={majorPx}
                y2={majorPx}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={majorStroke}
              />
              <line
                x1={0}
                y1={majorPx}
                x2={majorPx}
                y2={majorPx}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={majorStroke}
              />
            </pattern>

            {/* Clip to composition bounds */}
            <clipPath id={clipId}>
              <rect
                x={compX}
                y={compY}
                width={compW}
                height={compH}
              />
            </clipPath>
          </defs>

          {/* Grid — clipped to composition bounds */}
          <rect
            x={compX}
            y={compY}
            width={compW}
            height={compH}
            fill={`url(#${majorPatternId})`}
            clipPath={`url(#${clipId})`}
          />
        </>
      )}

      {/* Center crosshair — very subtle */}
      <g opacity={0.25}>
        <line
          x1={cx - 16}
          y1={cy}
          x2={cx + 16}
          y2={cy}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={0.5}
        />
        <line
          x1={cx}
          y1={cy - 16}
          x2={cx}
          y2={cy + 16}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={0.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={1.5}
          fill="rgba(255,255,255,0.4)"
        />
      </g>
    </svg>
  );
};