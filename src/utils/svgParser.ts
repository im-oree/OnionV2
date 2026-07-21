/**
 * SVG parser — converts an SVG string into an array of path descriptors
 * suitable for creating multiple ShapePath layers.
 */
import type { PathCommand, ShapeFill, ShapePath, GradientFill } from '../types/layer';
import { computePathBounds } from '../types/layer';

export interface ParsedSvgLayer {
  name: string;
  path: ShapePath;
  x: number;  // world offset from svg origin
  y: number;
}

export interface ParsedSvg {
  layers: ParsedSvgLayer[];
  width: number;
  height: number;
}

/** Parse an SVG string into layer descriptors — enhanced with stroke, gradient, group transform support */
export function parseSvg(svgText: string): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return { layers: [], width: 0, height: 0 };

  const viewBox = svgEl.getAttribute('viewBox');
  let width = 0, height = 0;
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    width = parts[2] || 0; height = parts[3] || 0;
  } else {
    width = parseFloat(svgEl.getAttribute('width') || '100');
    height = parseFloat(svgEl.getAttribute('height') || '100');
  }

  // Pre-parse gradient defs
  const defs: Record<string, { type: 'linear' | 'radial'; stops: { offset: number; color: string }[] }> = {};
  const defElements = svgEl.querySelectorAll('linearGradient, radialGradient');
  defElements.forEach((gradEl) => {
    const id = gradEl.getAttribute('id');
    if (!id) return;
    const type = gradEl.tagName.toLowerCase() === 'lineargradient' ? 'linear' : 'radial';
    const stops: { offset: number; color: string }[] = [];
    gradEl.querySelectorAll('stop').forEach((stop) => {
      const offset = parseFloat(stop.getAttribute('offset') || '0') / 100;
      const color = stop.getAttribute('stop-color') || '#000';
      stops.push({ offset, color });
    });
    defs[id] = { type, stops };
  });

  const layers: ParsedSvgLayer[] = [];
  let idx = 0;

  const extractStroke = (el: Element): { color: string; width: number; opacity: number } | null => {
    const stroke = el.getAttribute('stroke');
    const style = el.getAttribute('style') || '';
    const styleMatch = style.match(/stroke:\s*([^;]+)/);
    const color = stroke || (styleMatch ? styleMatch[1] : null);
    if (!color || color === 'none') return null;
    const width = parseFloat(el.getAttribute('stroke-width') || style.match(/stroke-width:\s*([\d.]+)/)?.[1] || '1');
    const opacity = parseFloat(el.getAttribute('stroke-opacity') || style.match(/stroke-opacity:\s*([\d.]+)/)?.[1] || '1');
    return { color: color.trim(), width, opacity: Math.round(opacity * 100) };
  };

  const resolveFill = (el: Element): ShapeFill | null => {
    const fillAttr = el.getAttribute('fill');
    const styleAttr = el.getAttribute('style') || '';
    const styleMatch = styleAttr.match(/fill:\s*([^;]+)/);
    const fillVal = fillAttr || (styleMatch ? styleMatch[1] : null);
    if (!fillVal || fillVal === 'none') return null;

    // Check for url(#gradientId) reference
    const urlMatch = fillVal.trim().match(/^url\(\s*#([^)]+)\s*\)$/);
    if (urlMatch && defs[urlMatch[1]]) {
      const grad = defs[urlMatch[1]];
      const stops = grad.stops;
      if (stops.length > 0) {
        const gradient: GradientFill = grad.type === 'linear'
          ? { type: 'linear-gradient', angle: 0, stops }
          : { type: 'radial-gradient', centerX: 0.5, centerY: 0.5, radius: 0.5, stops };
        return { type: 'solid' as const, color: stops[0].color, opacity: 100, gradient };
      }
    }

    let color = fillVal.trim();
    if (color.startsWith('rgb')) {
      const m = color.match(/\d+/g);
      if (m && m.length >= 3) {
        const [r, g, b] = m.map(Number);
        color = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      }
    }
    const opacityAttr = el.getAttribute('fill-opacity') || el.getAttribute('opacity');
    const opacity = opacityAttr ? Math.round(parseFloat(opacityAttr) * 100) : 100;
    return { type: 'solid', color, opacity };
  };

  const walk = (el: Element, groupTransform?: { tx: number; ty: number; sx: number; sy: number }) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'defs') continue; // skip defs when walking children

      // Track group transform: parse transform="translate(x,y) scale(sx,sy)"
      let childTransform = groupTransform ? { ...groupTransform } : undefined;
      const transformAttr = child.getAttribute('transform');
      if (transformAttr) {
        const translateMatch = transformAttr.match(/translate\(\s*([\d.\-]+)\s*,?\s*([\d.\-]+)?\s*\)/);
        const scaleMatch = transformAttr.match(/scale\(\s*([\d.\-]+)\s*,?\s*([\d.\-]+)?\s*\)/);
        if (translateMatch) {
          childTransform = childTransform || { tx: 0, ty: 0, sx: 1, sy: 1 };
          childTransform.tx += parseFloat(translateMatch[1]);
          childTransform.ty += parseFloat(translateMatch[2] || '0');
        }
        if (scaleMatch) {
          childTransform = childTransform || { tx: 0, ty: 0, sx: 1, sy: 1 };
          childTransform.sx *= parseFloat(scaleMatch[1]);
          childTransform.sy *= parseFloat(scaleMatch[2] || scaleMatch[1]);
        }
      }

      let commands: PathCommand[] | null = null;
      if (tag === 'path') {
        commands = parseSvgPathD(child.getAttribute('d') || '');
      } else if (tag === 'rect') {
        commands = rectToCommands(child);
      } else if (tag === 'circle') {
        commands = circleToCommands(child);
      } else if (tag === 'ellipse') {
        commands = ellipseToCommands(child);
      } else if (tag === 'polygon' || tag === 'polyline') {
        commands = polyToCommands(child, tag === 'polygon');
      } else if (tag === 'g') {
        walk(child, childTransform);
        continue;
      } else if (tag === 'line') {
        commands = lineToCommands(child);
      }

      if (commands && commands.length > 0) {
        // Apply group transform to command points
        if (childTransform) {
          commands = commands.map(cmd => ({
            ...cmd,
            points: cmd.points.map((v, i) => i % 2 === 0
              ? v * childTransform!.sx + childTransform!.tx
              : v * childTransform!.sy + childTransform!.ty,
            ),
          }));
        }

        const fill = resolveFill(child);
        const stroke = extractStroke(child);
        const bounds = computePathBounds(commands);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        const centered = commands.map(c => ({
          type: c.type,
          points: c.points.map((v, i) => i % 2 === 0 ? v - cx : v - cy),
        }));
        const centeredBounds = computePathBounds(centered);
        idx++;
        const shapePath: ShapePath = {
          type: 'path',
          commands: centered,
          bounds: centeredBounds,
          fill: fill ?? undefined,
        };
        if (stroke) {
          shapePath.stroke = {
            enabled: true,
            color: stroke.color,
            width: stroke.width,
            opacity: stroke.opacity,
            fillType: 'solid',
            cap: 'round',
            join: 'round',
            dashArray: [],
            dashOffset: 0,
          };
        }
        layers.push({
          name: child.getAttribute('id') || `Path ${idx}`,
          x: cx - width / 2,
          y: -(cy - height / 2),
          path: shapePath,
        });
      }
    }
  };

  walk(svgEl);
  return { layers, width, height };
}

function lineToCommands(el: Element): PathCommand[] {
  const x1 = parseFloat(el.getAttribute('x1') || '0');
  const y1 = parseFloat(el.getAttribute('y1') || '0');
  const x2 = parseFloat(el.getAttribute('x2') || '0');
  const y2 = parseFloat(el.getAttribute('y2') || '0');
  return [
    { type: 'M', points: [x1, y1] },
    { type: 'L', points: [x2, y2] },
  ];
}

/** Parse an SVG path "d" attribute into commands. Handles M/L/C/Q/Z (absolute + relative). */
export function parseSvgPathD(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let i = 0;
  let cursor = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let lastCmd = '';

  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    let cmd = tokens[i];
    if (/[a-zA-Z]/.test(cmd)) { i++; lastCmd = cmd; }
    else { cmd = lastCmd; }

    const abs = cmd === cmd.toUpperCase();
    const c = cmd.toLowerCase();

    if (c === 'm') {
      const x = num(), y = num();
      cursor = abs ? { x, y } : { x: cursor.x + x, y: cursor.y + y };
      start = { ...cursor };
      commands.push({ type: 'M', points: [cursor.x, cursor.y] });
      lastCmd = abs ? 'L' : 'l'; // subsequent implicit → lineTo
    } else if (c === 'l') {
      const x = num(), y = num();
      cursor = abs ? { x, y } : { x: cursor.x + x, y: cursor.y + y };
      commands.push({ type: 'L', points: [cursor.x, cursor.y] });
    } else if (c === 'h') {
      const x = num();
      cursor.x = abs ? x : cursor.x + x;
      commands.push({ type: 'L', points: [cursor.x, cursor.y] });
    } else if (c === 'v') {
      const y = num();
      cursor.y = abs ? y : cursor.y + y;
      commands.push({ type: 'L', points: [cursor.x, cursor.y] });
    } else if (c === 'c') {
      const c1x = num(), c1y = num(), c2x = num(), c2y = num(), x = num(), y = num();
      const a1x = abs ? c1x : cursor.x + c1x;
      const a1y = abs ? c1y : cursor.y + c1y;
      const a2x = abs ? c2x : cursor.x + c2x;
      const a2y = abs ? c2y : cursor.y + c2y;
      const nx = abs ? x : cursor.x + x;
      const ny = abs ? y : cursor.y + y;
      commands.push({ type: 'C', points: [a1x, a1y, a2x, a2y, nx, ny] });
      cursor = { x: nx, y: ny };
    } else if (c === 'q') {
      const cx = num(), cy = num(), x = num(), y = num();
      const acx = abs ? cx : cursor.x + cx;
      const acy = abs ? cy : cursor.y + cy;
      const nx = abs ? x : cursor.x + x;
      const ny = abs ? y : cursor.y + y;
      commands.push({ type: 'Q', points: [acx, acy, nx, ny] });
      cursor = { x: nx, y: ny };
    } else if (c === 'z') {
      commands.push({ type: 'Z', points: [] });
      cursor = { ...start };
    } else {
      // Unsupported command (S, T, A) — skip one number to prevent infinite loop
      i++;
    }
  }
  return commands;
}

function rectToCommands(el: Element): PathCommand[] {
  const x = parseFloat(el.getAttribute('x') || '0');
  const y = parseFloat(el.getAttribute('y') || '0');
  const w = parseFloat(el.getAttribute('width') || '0');
  const h = parseFloat(el.getAttribute('height') || '0');
  return [
    { type: 'M', points: [x, y] },
    { type: 'L', points: [x + w, y] },
    { type: 'L', points: [x + w, y + h] },
    { type: 'L', points: [x, y + h] },
    { type: 'Z', points: [] },
  ];
}

function circleToCommands(el: Element): PathCommand[] {
  const cx = parseFloat(el.getAttribute('cx') || '0');
  const cy = parseFloat(el.getAttribute('cy') || '0');
  const r = parseFloat(el.getAttribute('r') || '0');
  return ellipseCircleCommands(cx, cy, r, r);
}

function ellipseToCommands(el: Element): PathCommand[] {
  const cx = parseFloat(el.getAttribute('cx') || '0');
  const cy = parseFloat(el.getAttribute('cy') || '0');
  const rx = parseFloat(el.getAttribute('rx') || '0');
  const ry = parseFloat(el.getAttribute('ry') || '0');
  return ellipseCircleCommands(cx, cy, rx, ry);
}

function ellipseCircleCommands(cx: number, cy: number, rx: number, ry: number): PathCommand[] {
  // Approximate ellipse with 4 cubic bezier segments
  const k = 0.5522848; // magic bezier constant
  const ox = rx * k, oy = ry * k;
  return [
    { type: 'M', points: [cx - rx, cy] },
    { type: 'C', points: [cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry] },
    { type: 'C', points: [cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy] },
    { type: 'C', points: [cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry] },
    { type: 'C', points: [cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy] },
    { type: 'Z', points: [] },
  ];
}

function polyToCommands(el: Element, closed: boolean): PathCommand[] {
  const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
  if (pts.length < 4) return [];
  const commands: PathCommand[] = [{ type: 'M', points: [pts[0], pts[1]] }];
  for (let i = 2; i < pts.length; i += 2) {
    commands.push({ type: 'L', points: [pts[i], pts[i + 1]] });
  }
  if (closed) commands.push({ type: 'Z', points: [] });
  return commands;
}