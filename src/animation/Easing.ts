/**
 * Easing — standard easing presets for keyframe interpolation.
 * Each preset maps to bezier handle (control point) positions for storage.
 * All functions map t ∈ [0,1] → eased value ∈ [0,1].
 */

export interface EasingPreset {
  name: string;
  bezierIn: { x: number; y: number };
  bezierOut: { x: number; y: number };
  fn: (t: number) => number;
}

export const EASING: Record<string, EasingPreset> = {
  linear: {
    name: 'Linear',
    bezierIn: { x: 0, y: 0 },
    bezierOut: { x: 1, y: 1 },
    fn: (t) => t,
  },
  easeInQuad: {
    name: 'Ease In Quad',
    bezierIn: { x: 0.55, y: 0 }, bezierOut: { x: 1, y: 0.45 },
    fn: (t) => t * t,
  },
  easeOutQuad: {
    name: 'Ease Out Quad',
    bezierIn: { x: 0.45, y: 0 }, bezierOut: { x: 1, y: 0.55 },
    fn: (t) => t * (2 - t),
  },
  easeInOutQuad: {
    name: 'Ease In-Out Quad',
    bezierIn: { x: 0.65, y: 0 }, bezierOut: { x: 0.35, y: 1 },
    fn: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  },
  easeInCubic: {
    name: 'Ease In Cubic',
    bezierIn: { x: 0.75, y: 0 }, bezierOut: { x: 1, y: 0.25 },
    fn: (t) => t * t * t,
  },
  easeOutCubic: {
    name: 'Ease Out Cubic',
    bezierIn: { x: 0.25, y: 0 }, bezierOut: { x: 1, y: 0.75 },
    fn: (t) => (--t) * t * t + 1,
  },
  easeInOutCubic: {
    name: 'Ease In-Out Cubic',
    bezierIn: { x: 0.65, y: 0 }, bezierOut: { x: 0.35, y: 1 },
    fn: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  },
  easeInExpo: {
    name: 'Ease In Expo',
    bezierIn: { x: 0.95, y: 0 }, bezierOut: { x: 1, y: 0.05 },
    fn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  },
  easeOutExpo: {
    name: 'Ease Out Expo',
    bezierIn: { x: 0.05, y: 0 }, bezierOut: { x: 1, y: 0.95 },
    fn: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  },
  easeInOutExpo: {
    name: 'Ease In-Out Expo',
    bezierIn: { x: 1, y: 0 }, bezierOut: { x: 0, y: 1 },
    fn: (t) => {
      if (t === 0 || t === 1) return t;
      const p = t * 2;
      return p < 1 ? 0.5 * Math.pow(2, 10 * (p - 1)) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
    },
  },
};

/** Get easing function by name */
export function getEasingFn(name: string): (t: number) => number {
  return EASING[name]?.fn ?? EASING.linear.fn;
}

/** Create a cubic-bezier CSS-like string from an easing name */
export function easingToCSS(name: string): string {
  const e = EASING[name];
  if (!e || name === 'linear') return 'linear';
  return `cubic-bezier(${e.bezierIn.x}, ${e.bezierIn.y}, ${e.bezierOut.x}, ${e.bezierOut.y})`;
}
