import type { IconName } from '../../ui/common/Icon';

export interface ShapeParamDef {
  id: string; label: string;
  min: number; max: number; step: number; default: number;
  precision?: number; unit?: string;
}

export interface ShapePresetDef {
  id: string; label: string;
  category: 'basic' | 'polygon' | 'star' | 'symbol' | 'decorative' | 'arrow' | 'ui';
  icon: IconName;
  defaultSize: { width: number; height: number };
  params: ShapeParamDef[];
}

const p = (id: string, label: string, def: number, min: number, max: number, step = 1, precision = 0, unit = ''): ShapeParamDef =>
  ({ id, label, default: def, min, max, step, precision, unit });

const ROUND = p('roundness', 'Roundness', 0, 0, 1, 0.01, 2);
const ROT = p('rotation', 'Rotation', 0, -360, 360, 1, 0, '°');

export const SHAPE_PRESETS: ShapePresetDef[] = [
  // ─── BASIC ────────────────────────────────────
  { id: 'rectangle', label: 'Rectangle', category: 'basic', icon: 'rectangle',
    defaultSize: { width: 200, height: 150 },
    params: [p('roundness', 'Corner Radius', 0, 0, 500, 1)] },

  { id: 'ellipse', label: 'Ellipse', category: 'basic', icon: 'ellipse',
    defaultSize: { width: 200, height: 200 }, params: [] },

  { id: 'circle', label: 'Circle', category: 'basic', icon: 'ellipse',
    defaultSize: { width: 200, height: 200 }, params: [] },

  { id: 'capsule', label: 'Capsule', category: 'basic', icon: 'rectangle',
    defaultSize: { width: 240, height: 100 }, params: [] },

  { id: 'ring', label: 'Ring', category: 'basic', icon: 'ellipse',
    defaultSize: { width: 200, height: 200 },
    params: [p('thickness', 'Thickness', 0.25, 0.05, 0.9, 0.01, 2)] },

  { id: 'semiCircle', label: 'Semi Circle', category: 'basic', icon: 'ellipse',
    defaultSize: { width: 200, height: 100 }, params: [ROT] },

  { id: 'quarterCircle', label: 'Quarter Circle', category: 'basic', icon: 'ellipse',
    defaultSize: { width: 200, height: 200 }, params: [ROT] },

  // ─── POLYGONS ────────────────────────────────
  { id: 'triangle', label: 'Triangle', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROUND, ROT] },

  { id: 'rightTriangle', label: 'Right Triangle', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROT] },

  { id: 'pentagon', label: 'Pentagon', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROUND, ROT] },

  { id: 'hexagon', label: 'Hexagon', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROUND, ROT] },

  { id: 'heptagon', label: 'Heptagon', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROUND, ROT] },

  { id: 'octagon', label: 'Octagon', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROUND, ROT] },

  { id: 'polygon', label: 'Polygon (N-sides)', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 },
    params: [p('sides', 'Sides', 6, 3, 32, 1), ROUND, ROT] },

  { id: 'diamond', label: 'Diamond', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 200, height: 200 }, params: [ROUND] },

  { id: 'parallelogram', label: 'Parallelogram', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 240, height: 160 },
    params: [p('skew', 'Skew', 0.2, -0.6, 0.6, 0.02, 2)] },

  { id: 'trapezoid', label: 'Trapezoid', category: 'polygon', icon: 'polygon',
    defaultSize: { width: 240, height: 160 },
    params: [p('topRatio', 'Top Width', 0.5, 0.1, 1, 0.02, 2)] },

  // ─── STARS ────────────────────────────────
  { id: 'star', label: 'Star', category: 'star', icon: 'polygon',
    defaultSize: { width: 200, height: 200 },
    params: [
      p('points', 'Points', 5, 3, 20, 1),
      p('innerRatio', 'Inner Ratio', 0.5, 0.1, 0.95, 0.01, 2),
      ROUND, ROT,
    ] },

  { id: 'starBurst', label: 'Starburst', category: 'star', icon: 'polygon',
    defaultSize: { width: 220, height: 220 },
    params: [
      p('points', 'Rays', 12, 4, 40, 1),
      p('innerRatio', 'Inner Ratio', 0.75, 0.3, 0.95, 0.01, 2),
      ROT,
    ] },

  { id: 'sparkle', label: 'Sparkle', category: 'star', icon: 'polygon',
    defaultSize: { width: 120, height: 120 },
    params: [
      p('points', 'Points', 4, 3, 8, 1),
      p('innerRatio', 'Sharpness', 0.2, 0.05, 0.6, 0.01, 2),
      ROT,
    ] },

  // ─── SYMBOLS ────────────────────────────────
  { id: 'chatbox', label: 'Chat Bubble', category: 'symbol', icon: 'rectangle',
    defaultSize: { width: 260, height: 160 },
    params: [
      p('roundness', 'Corner Radius', 16, 0, 80, 1),
      p('tailWidth', 'Tail Width', 24, 6, 80, 1),
      p('tailHeight', 'Tail Height', 20, 4, 80, 1),
      p('tailX', 'Tail Position', -0.3, -1, 1, 0.05, 2),
    ] },

  { id: 'heart', label: 'Heart', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 200, height: 180 }, params: [] },

  { id: 'cross', label: 'Cross / Plus', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 180, height: 180 },
    params: [p('thickness', 'Thickness', 0.3, 0.1, 0.7, 0.02, 2)] },

  { id: 'checkmark', label: 'Checkmark', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 200, height: 160 },
    params: [p('thickness', 'Thickness', 0.15, 0.05, 0.35, 0.01, 2)] },

  { id: 'drop', label: 'Drop', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 140, height: 200 }, params: [] },

  { id: 'cloud', label: 'Cloud', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 240, height: 160 }, params: [] },

  { id: 'moon', label: 'Moon', category: 'symbol', icon: 'ellipse',
    defaultSize: { width: 180, height: 180 },
    params: [p('phase', 'Phase', 0.5, 0.1, 0.95, 0.02, 2)] },

  { id: 'sun', label: 'Sun', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 200, height: 200 },
    params: [p('rays', 'Rays', 8, 4, 24, 1), p('rayLength', 'Ray Length', 0.35, 0.1, 0.8, 0.02, 2)] },

  { id: 'shield', label: 'Shield', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 180, height: 220 }, params: [] },

  { id: 'badge', label: 'Badge', category: 'symbol', icon: 'polygon',
    defaultSize: { width: 200, height: 200 },
    params: [p('bumps', 'Bumps', 12, 6, 24, 1), p('depth', 'Depth', 0.08, 0.02, 0.2, 0.01, 2)] },

  // ─── ARROWS ────────────────────────────────
  { id: 'arrow', label: 'Arrow', category: 'arrow', icon: 'polygon',
    defaultSize: { width: 220, height: 120 },
    params: [
      p('headWidth', 'Head Width', 0.4, 0.1, 0.8, 0.02, 2),
      p('shaftHeight', 'Shaft Height', 0.4, 0.1, 0.9, 0.02, 2),
    ] },

  { id: 'arrowDouble', label: 'Double Arrow', category: 'arrow', icon: 'polygon',
    defaultSize: { width: 260, height: 120 },
    params: [
      p('headWidth', 'Head Width', 0.25, 0.1, 0.45, 0.02, 2),
      p('shaftHeight', 'Shaft Height', 0.35, 0.1, 0.8, 0.02, 2),
    ] },

  { id: 'chevron', label: 'Chevron', category: 'arrow', icon: 'polygon',
    defaultSize: { width: 160, height: 200 },
    params: [p('thickness', 'Thickness', 0.3, 0.1, 0.6, 0.02, 2)] },

  { id: 'lightning', label: 'Lightning Bolt', category: 'decorative', icon: 'polygon',
    defaultSize: { width: 120, height: 200 }, params: [] },

  // ─── DECORATIVE ────────────────────────────────
  { id: 'gear', label: 'Gear', category: 'decorative', icon: 'polygon',
    defaultSize: { width: 200, height: 200 },
    params: [
      p('teeth', 'Teeth', 12, 6, 32, 1),
      p('toothDepth', 'Tooth Depth', 0.15, 0.05, 0.4, 0.01, 2),
    ] },

  { id: 'wave', label: 'Wave', category: 'decorative', icon: 'polygon',
    defaultSize: { width: 300, height: 120 },
    params: [
      p('amplitude', 'Amplitude', 0.5, 0.1, 1, 0.02, 2),
      p('frequency', 'Frequency', 2, 0.5, 8, 0.1, 1),
    ] },

  { id: 'zigzag', label: 'Zigzag', category: 'decorative', icon: 'polygon',
    defaultSize: { width: 300, height: 60 },
    params: [p('teeth', 'Teeth', 8, 3, 24, 1)] },

  { id: 'flower', label: 'Flower', category: 'decorative', icon: 'polygon',
    defaultSize: { width: 200, height: 200 },
    params: [
      p('petals', 'Petals', 6, 3, 16, 1),
      p('depth', 'Petal Depth', 0.4, 0.1, 0.8, 0.02, 2),
    ] },

  { id: 'blob', label: 'Blob', category: 'decorative', icon: 'ellipse',
    defaultSize: { width: 220, height: 200 },
    params: [
      p('points', 'Points', 6, 4, 12, 1),
      p('irregularity', 'Irregularity', 0.15, 0, 0.5, 0.02, 2),
      p('seed', 'Seed', 1, 1, 100, 1),
    ] },

  // ─── UI ────────────────────────────────
  { id: 'roundedSquare', label: 'Rounded Square', category: 'ui', icon: 'rectangle',
    defaultSize: { width: 180, height: 180 },
    params: [p('roundness', 'Corner Radius', 24, 0, 90, 1)] },

  { id: 'tag', label: 'Tag', category: 'ui', icon: 'polygon',
    defaultSize: { width: 220, height: 100 },
    params: [
      p('notch', 'Notch Depth', 0.15, 0.05, 0.4, 0.02, 2),
      p('roundness', 'Corner Radius', 10, 0, 30, 1),
    ] },

  { id: 'ribbon', label: 'Ribbon', category: 'ui', icon: 'rectangle',
    defaultSize: { width: 260, height: 80 },
    params: [p('notch', 'Notch Depth', 0.1, 0.05, 0.3, 0.01, 2)] },
];

export function getPresetById(id: string): ShapePresetDef | undefined {
  return SHAPE_PRESETS.find(s => s.id === id);
}

export function defaultParamsFor(preset: ShapePresetDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of preset.params) out[p.id] = p.default;
  return out;
}