/**
 * CameraFrameGuide — 2D SVG overlay showing the composition frame as a
 * viewfinder in 3D perspective camera view. Displays corner brackets,
 * darkened outside area, center crosshair, label, and rule-of-thirds grid.
 */
import React, { useEffect, useState, useId, useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';

interface Props {
  viewportSize: { width: number; height: number };
  /** Whether the viewport is in free-view (orbit) mode */
  isFreeView?: boolean;
}

// ── Extracted sub-components for readability ─────────────────

const CornerBracket: React.FC<{
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
}> = React.memo(({ x, y, dx, dy, size }) => (
  <g>
    <line
      x1={x} y1={y}
      x2={x + size * dx} y2={y}
      stroke="rgba(255,255,255,0.8)"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <line
      x1={x} y1={y}
      x2={x} y2={y + size * dy}
      stroke="rgba(255,255,255,0.8)"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </g>
));

CornerBracket.displayName = 'CornerBracket';

const Crosshair: React.FC<{
  cx: number;
  cy: number;
  size: number;
}> = React.memo(({ cx, cy, size }) => (
  <g>
    <line
      x1={cx - size} y1={cy}
      x2={cx + size} y2={cy}
      stroke="rgba(255,255,255,0.35)"
      strokeWidth={0.5}
    />
    <line
      x1={cx} y1={cy - size}
      x2={cx} y2={cy + size}
      stroke="rgba(255,255,255,0.35)"
      strokeWidth={0.5}
    />
  </g>
));

Crosshair.displayName = 'Crosshair';

const RuleOfThirds: React.FC<{
  fx: number;
  fy: number;
  fw: number;
  fh: number;
}> = React.memo(({ fx, fy, fw, fh }) => {
  const style = {
    stroke: 'rgba(255,255,255,0.22)',
    strokeWidth: 0.5,
    strokeDasharray: '4 3',
  };

  return (
    <g>
      <line x1={fx + fw / 3} y1={fy} x2={fx + fw / 3} y2={fy + fh} {...style} />
      <line x1={fx + fw * 2 / 3} y1={fy} x2={fx + fw * 2 / 3} y2={fy + fh} {...style} />
      <line x1={fx} y1={fy + fh / 3} x2={fx + fw} y2={fy + fh / 3} {...style} />
      <line x1={fx} y1={fy + fh * 2 / 3} x2={fx + fw} y2={fy + fh * 2 / 3} {...style} />
    </g>
  );
});

RuleOfThirds.displayName = 'RuleOfThirds';

// ── Main component ──────────────────────────────────────────

export const CameraFrameGuide: React.FC<Props> = ({
  viewportSize,
  isFreeView = false,
}) => {
  const maskId = useId();

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? (s.compositions.find(
          (c) => c.id === s.activeCompositionId,
        ) ?? null)
      : null,
  );

  const showRoT = useViewportStore(
    (s) => s.settings.showRuleOfThirds,
  );

  // Don't show if not in 3D perspective mode or if in free orbit view
  if (!comp?.perspective3D || isFreeView) return null;

  const vw = viewportSize.width || 1;
  const vh = viewportSize.height || 1;

  if (comp.width <= 0 || comp.height <= 0) return null;

  // Calculate frame to fit viewport maintaining comp aspect ratio
  const compAspect = comp.width / comp.height;
  const vpAspect = vw / vh;

  const fitFraction = 0.85;

  let frameW: number;
  let frameH: number;

  if (vpAspect > compAspect) {
    frameH = vh * fitFraction;
    frameW = frameH * compAspect;
  } else {
    frameW = vw * fitFraction;
    frameH = frameW / compAspect;
  }

  // Ensure frame doesn't exceed viewport
  frameW = Math.min(frameW, vw - 2);
  frameH = Math.min(frameH, vh - 2);

  const fx = (vw - frameW) / 2;
  const fy = (vh - frameH) / 2;

  const cx = fx + frameW / 2;
  const cy = fy + frameH / 2;

  const bracketSize = Math.min(20, frameW * 0.05, frameH * 0.05);

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 24,
      }}
      width={vw}
      height={vh}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={fx} y={fy}
            width={frameW} height={frameH}
            fill="black"
          />
        </mask>
      </defs>

      {/* Dark overlay outside frame */}
      <rect
        width={vw} height={vh}
        fill="rgba(0,0,0,0.45)"
        mask={`url(#${maskId})`}
      />

      {/* Frame border */}
      <rect
        x={fx} y={fy}
        width={frameW} height={frameH}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.5}
        strokeDasharray="8 4"
      />

      {/* Corner brackets */}
      <CornerBracket x={fx} y={fy} dx={1} dy={1} size={bracketSize} />
      <CornerBracket x={fx + frameW} y={fy} dx={-1} dy={1} size={bracketSize} />
      <CornerBracket x={fx + frameW} y={fy + frameH} dx={-1} dy={-1} size={bracketSize} />
      <CornerBracket x={fx} y={fy + frameH} dx={1} dy={-1} size={bracketSize} />

      {/* Center crosshair */}
      <Crosshair cx={cx} cy={cy} size={10} />

      {/* Label */}
      <text
        x={cx}
        y={fy - 10}
        textAnchor="middle"
        fill="rgba(255,255,255,0.45)"
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        style={{ userSelect: 'none' }}
      >
        Camera View — {comp.width}×{comp.height}
      </text>

      {/* Rule-of-thirds */}
      {showRoT && (
        <RuleOfThirds fx={fx} fy={fy} fw={frameW} fh={frameH} />
      )}
    </svg>
  );
};