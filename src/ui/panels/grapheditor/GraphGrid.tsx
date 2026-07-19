import React from 'react';

interface Props { viewBox: { x: number; y: number; w: number; h: number }; width: number; height: number; fps: number; }

function niceStep(range: number, target: number): number {
  const raw = range / target;
  const steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  for (const s of steps) if (s >= raw) return s;
  return steps[steps.length - 1];
}

function fmtVal(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(1);
  return v.toFixed(1);
}

const GRID_LINE = 'rgba(100,130,180,0.08)';
const GRID_LINE_MAJOR = 'rgba(120,150,200,0.15)';
const LABEL_COLOR = 'rgba(160,180,210,0.5)';

export const GraphGrid: React.FC<Props> = ({ viewBox, width, height, fps }) => {
  if (width <= 0 || height <= 0) return null;
  const fStep = niceStep(viewBox.w, 8);
  const vStep = niceStep(viewBox.h, 6);
  const nodes: React.ReactNode[] = [];
  const gradId = `gridGrad_${width}`;

  // Gradient background matching reference
  nodes.push(
    <defs key="defs">
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a2332" />
        <stop offset="50%" stopColor="#151d2a" />
        <stop offset="100%" stopColor="#111822" />
      </linearGradient>
    </defs>,
    <rect key="bg" x={0} y={0} width={width} height={height} fill={`url(#${gradId})`} />
  );

  // Vertical grid lines (time)
  const startF = Math.floor(viewBox.x / fStep) * fStep;
  const endF = viewBox.x + viewBox.w;
  for (let f = startF; f <= endF; f += fStep) {
    const px = ((f - viewBox.x) / viewBox.w) * width;
    if (px < -1 || px > width + 1) continue;
    const isZero = Math.abs(f) < 0.001;
    const isMajor = Math.abs(f % (fStep * 2)) < 0.001 || isZero;
    nodes.push(
      <line key={`v${f}`} x1={px} y1={0} x2={px} y2={height}
        stroke={isZero ? GRID_LINE_MAJOR : (isMajor ? GRID_LINE_MAJOR : GRID_LINE)}
        strokeWidth={isZero ? 1.2 : 0.6} />
    );
  }

  // Horizontal grid lines (values)
  const startV = Math.floor(viewBox.y / vStep) * vStep;
  for (let v = startV; v <= viewBox.y + viewBox.h; v += vStep) {
    const py = height - ((v - viewBox.y) / viewBox.h) * height;
    if (py < -1 || py > height + 1) continue;
    const isZero = Math.abs(v) < 0.001;
    const isMajor = isZero;
    nodes.push(
      <line key={`h${v}`} x1={0} y1={py} x2={width} y2={py}
        stroke={isZero ? GRID_LINE_MAJOR : GRID_LINE}
        strokeWidth={isZero ? 1.2 : 0.6} />
    );
    // Value labels on left
    nodes.push(
      <text key={`hl${v}`} x={8} y={py - 4}
        fill={LABEL_COLOR} fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        pointerEvents="none">
        {fmtVal(v)}
      </text>
    );
  }
  void fps;
  return <g pointerEvents="none">{nodes}</g>;
};
