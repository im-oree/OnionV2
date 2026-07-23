/**
 * Mask shape generators.
 *
 * Every generator takes normalized width & height (relative to the mask's
 * sizeW/sizeH — NOT the layer's size) and per-shape params, and returns
 * PathCommand[] centered at (0,0). The mask's positionX/Y and rotation
 * are applied separately by the compositor / overlay.
 */
import type { PathCommand } from '../types/layer';
import type { MaskShapeType, MaskShapeParams, BrushStroke } from '../types/mask';

// ── Primitives ────────────────────────────────────────────────

function rectPath(w: number, h: number, r: number = 0): PathCommand[] {
  const hw = w / 2, hh = h / 2;
  const rr = Math.max(0, Math.min(r, Math.min(hw, hh)));
  if (rr === 0) {
    return [
      { type: 'M', points: [-hw, -hh] },
      { type: 'L', points: [ hw, -hh] },
      { type: 'L', points: [ hw,  hh] },
      { type: 'L', points: [-hw,  hh] },
      { type: 'Z', points: [] },
    ];
  }
  // Rounded rect via cubic beziers (kappa)
  const k = 0.5522847498;
  const kr = rr * k;
  return [
    { type: 'M', points: [-hw + rr, -hh] },
    { type: 'L', points: [ hw - rr, -hh] },
    { type: 'C', points: [ hw - rr + kr, -hh, hw, -hh + rr - kr, hw, -hh + rr] },
    { type: 'L', points: [ hw,  hh - rr] },
    { type: 'C', points: [ hw,  hh - rr + kr, hw - rr + kr,  hh, hw - rr,  hh] },
    { type: 'L', points: [-hw + rr,  hh] },
    { type: 'C', points: [-hw + rr - kr,  hh, -hw,  hh - rr + kr, -hw,  hh - rr] },
    { type: 'L', points: [-hw, -hh + rr] },
    { type: 'C', points: [-hw, -hh + rr - kr, -hw + rr - kr, -hh, -hw + rr, -hh] },
    { type: 'Z', points: [] },
  ];
}

function ellipsePath(rx: number, ry: number): PathCommand[] {
  const k = 0.5522847498;
  return [
    { type: 'M', points: [-rx, 0] },
    { type: 'C', points: [-rx, -ry * k, -rx * k, -ry, 0, -ry] },
    { type: 'C', points: [rx * k, -ry, rx, -ry * k, rx, 0] },
    { type: 'C', points: [rx, ry * k, rx * k, ry, 0, ry] },
    { type: 'C', points: [-rx * k, ry, -rx, ry * k, -rx, 0] },
    { type: 'Z', points: [] },
  ];
}

function starPath(w: number, h: number, sides = 5, innerRatio = 0.4): PathCommand[] {
  const points = Math.max(3, Math.min(20, Math.round(sides)));
  const outerRx = w / 2;
  const outerRy = h / 2;
  const innerRx = outerRx * innerRatio;
  const innerRy = outerRy * innerRatio;
  const step = Math.PI / points;
  const cmds: PathCommand[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rx = (i % 2 === 0) ? outerRx : innerRx;
    const ry = (i % 2 === 0) ? outerRy : innerRy;
    // Rotate so first point is up
    const a = i * step - Math.PI / 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    cmds.push({ type: i === 0 ? 'M' : 'L', points: [x, y] });
  }
  cmds.push({ type: 'Z', points: [] });
  return cmds;
}

function heartPath(w: number, h: number): PathCommand[] {
  // Classic parametric heart, scaled to fit w × h
  const cx = 0;
  const cy = 0;
  const sx = w / 2;
  const sy = h / 2;
  const cmds: PathCommand[] = [];
  const segments = 60;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    // Parametric heart: x = 16 sin³t; y = -(13 cos t - 5 cos 2t - 2 cos 3t - cos 4t)
    const px = 16 * Math.pow(Math.sin(t), 3);
    const py = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    const x = cx + (px / 17) * sx;
    const y = cy + (py / 17) * sy;
    cmds.push({ type: i === 0 ? 'M' : 'L', points: [x, y] });
  }
  cmds.push({ type: 'Z', points: [] });
  return cmds;
}

function filmstripPath(
  w: number, h: number, count = 8, gapFrac = 0.15,
): PathCommand[] {
  // Vertical strips: `count` bars filling width `w`, height `h`
  const n = Math.max(2, Math.min(40, Math.round(count)));
  const totalGap = gapFrac;                       // fraction of total width
  const barFrac = (1 - totalGap) / n;
  const gap = (totalGap / (n - 1)) * w;
  const barW = barFrac * w;
  const hw = w / 2;
  const hh = h / 2;
  const cmds: PathCommand[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = -hw + i * (barW + gap);
    const x1 = x0 + barW;
    cmds.push({ type: 'M', points: [x0, -hh] });
    cmds.push({ type: 'L', points: [x1, -hh] });
    cmds.push({ type: 'L', points: [x1,  hh] });
    cmds.push({ type: 'L', points: [x0,  hh] });
    cmds.push({ type: 'Z', points: [] });
  }
  return cmds;
}

function splitPath(
  w: number, h: number,
  direction: 'vertical' | 'horizontal' = 'vertical',
  offset = 0,
): PathCommand[] {
  const hw = w / 2, hh = h / 2;
  if (direction === 'vertical') {
    const cutX = offset * hw;
    // Keep the LEFT half
    return [
      { type: 'M', points: [-hw, -hh] },
      { type: 'L', points: [cutX, -hh] },
      { type: 'L', points: [cutX,  hh] },
      { type: 'L', points: [-hw,  hh] },
      { type: 'Z', points: [] },
    ];
  } else {
    const cutY = offset * hh;
    // Keep the TOP half
    return [
      { type: 'M', points: [-hw, -hh] },
      { type: 'L', points: [ hw, -hh] },
      { type: 'L', points: [ hw, cutY] },
      { type: 'L', points: [-hw, cutY] },
      { type: 'Z', points: [] },
    ];
  }
}

// ── Text mask via Path2D + Canvas measurement ────────────────

function textPath(
  w: number, h: number, params: MaskShapeParams,
): PathCommand[] {
  const text = params.textContent ?? 'Text';
  const font = params.textFont ?? 'system-ui, sans-serif';
  const size = params.textSize ?? Math.min(w, h) * 0.4;
  const bold = params.textBold ? 'bold' : 'normal';
  const italic = params.textItalic ? 'italic' : 'normal';
  const align = params.textAlign ?? 'center';
  const charSpacing = params.textCharacterSpacing ?? 0;
  const lineSpacing = params.textLineSpacing ?? 0;

  // For the mask path, we approximate glyph shapes with rectangles
  // sized to actual text metrics — the compositor uses a real canvas
  // for the final render (see MaskCompositor changes in 6C).
  // Here we just return an outer bounding rect so bounds & handles work.
  // The compositor detects shapeType === 'text' and renders text directly.
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) return rectPath(w, h);

  mCtx.font = `${italic} ${bold} ${size}px ${font}`;
  const lines = text.split('\n');
  const lineHeight = size * (1 + lineSpacing / 100);
  let maxWidth = 0;
  for (const line of lines) {
    // Character-spacing approximation
    const baseW = mCtx.measureText(line).width;
    const withSpacing = baseW + charSpacing * (line.length - 1);
    if (withSpacing > maxWidth) maxWidth = withSpacing;
  }
  const totalHeight = lineHeight * lines.length;

  // Bounding path (used for handles/hit testing). The compositor
  // paints the actual glyphs directly.
  const bx = maxWidth / 2;
  const by = totalHeight / 2;
  const alignShift = align === 'left' ? -bx : align === 'right' ? bx : 0;
  return rectPath(maxWidth, totalHeight).map(cmd => ({
    ...cmd,
    points: cmd.points.map((v, i) => i % 2 === 0 ? v + alignShift : v),
  }));
}

// ── Brush → path (vectorized stroke) ────────────────────────

function brushPath(strokes: BrushStroke[]): PathCommand[] {
  // Each stroke becomes a stroked polyline. For the mask path we
  // return a "thick line" polygon by offsetting perpendicular to
  // each segment by half the brush size. For simplicity we render
  // each stroke as its own sub-path (M ... L ... L ... Z).
  const cmds: PathCommand[] = [];
  if (!strokes || strokes.length === 0) return cmds;

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    const r = stroke.size / 2;

    // Build left-side offset points
    const leftPts: [number, number][] = [];
    const rightPts: [number, number][] = [];

    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      let nx: number, ny: number;
      if (i === 0) {
        const p1 = stroke.points[i + 1];
        const dx = p1.x - p.x;
        const dy = p1.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else if (i === stroke.points.length - 1) {
        const p0 = stroke.points[i - 1];
        const dx = p.x - p0.x;
        const dy = p.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      }
      leftPts.push([p.x + nx * r, p.y + ny * r]);
      rightPts.push([p.x - nx * r, p.y - ny * r]);
    }

    // Build M/L path around the stroke
    cmds.push({ type: 'M', points: [leftPts[0][0], leftPts[0][1]] });
    for (let i = 1; i < leftPts.length; i++) {
      cmds.push({ type: 'L', points: [leftPts[i][0], leftPts[i][1]] });
    }
    for (let i = rightPts.length - 1; i >= 0; i--) {
      cmds.push({ type: 'L', points: [rightPts[i][0], rightPts[i][1]] });
    }
    cmds.push({ type: 'Z', points: [] });
  }
  return cmds;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Generate the PathCommand[] for a mask given its shape type + params + size.
 * Result is centered at (0,0). Transform (position/rotation) applied elsewhere.
 */
export function generateMaskPath(
  shapeType: MaskShapeType,
  sizeW: number,
  sizeH: number,
  params: MaskShapeParams,
  existingCommands?: PathCommand[],
): PathCommand[] {
  const w = Math.max(2, sizeW);
  const h = Math.max(2, sizeH);

  switch (shapeType) {
    case 'rectangle':
      return rectPath(w, h, params.roundCorners ?? 0);
    case 'ellipse':
    case 'circle':
      return ellipsePath(w / 2, h / 2);
    case 'star':
      return starPath(w, h, params.sides ?? 5, params.innerRatio ?? 0.4);
    case 'heart':
      return heartPath(w, h);
    case 'filmstrip':
      return filmstripPath(w, h, params.stripCount ?? 8, params.stripGap ?? 0.15);
    case 'split':
      return splitPath(w, h, params.splitDirection ?? 'vertical', params.splitOffset ?? 0);
    case 'text':
      return textPath(w, h, params);
    case 'brush':
      return brushPath(params.brushStrokes ?? []);
    case 'pen':
    case 'path':
      // Pen and path masks keep their existing commands from the pen tool
      return existingCommands && existingCommands.length > 0
        ? existingCommands
        : rectPath(w, h);
    default:
      return rectPath(w, h);
  }
}

/** Compute bounding box of PathCommand[] */
export function computeMaskBounds(commands: PathCommand[]): {
  minX: number; minY: number; maxX: number; maxY: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cmd of commands) {
    for (let i = 0; i < cmd.points.length; i += 2) {
      const x = cmd.points[i];
      const y = cmd.points[i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}