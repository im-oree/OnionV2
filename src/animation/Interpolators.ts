/**
 * Interpolators — pure math functions for value interpolation.
 * All functions are deterministic and side-effect-free.
 */

export type Vec2 = { x: number; y: number };

/** Linear interpolation between two numbers */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolation between two Vec2s */
export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Cubic bezier evaluation using De Casteljau's algorithm.
 * p0 and p3 are fixed at (0,0) and (1,1).
 * p1 and p2 are the control points.
 */
export function cubicBezier(t: number, p1y: number, p2y: number): number {
  const t1 = 1 - t;
  const t2 = t * t;
  const t12 = t1 * t1;
  // Compute y at given t on cubic bezier: B(t) = (1-t)³·0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·1
  return 3 * t12 * t * p1y + 3 * t1 * t2 * p2y + t2 * t;
}

/**
 * Given x on a cubic bezier curve, find the corresponding t (parameter) using Newton-Raphson.
 * This is needed for AE-style time-remapped bezier curves where you have (x,y) control points
 * and want to find y for a given x (since x advances at a constant rate, not t).
 */
export function solveBezierT(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  targetX: number,
): number {
  // Newton-Raphson to find t where bezierX(t) = targetX
  let t = targetX; // Initial guess
  for (let i = 0; i < 10; i++) {
    const x = bezierComponent(t, p1x, p2x) - targetX;
    if (Math.abs(x) < 1e-7) break;
    const dx = bezierDerivative(t, p1x, p2x);
    if (Math.abs(dx) < 1e-7) break;
    t -= x / dx;
  }
  t = clamp(t, 0, 1);
  // Compute the Y value at this t using the Y control points
  return cubicBezier(t, p1y, p2y);
}

function bezierComponent(t: number, p1: number, p2: number): number {
  const t1 = 1 - t;
  return 3 * t1 * t1 * t * p1 + 3 * t1 * t * t * p2 + t * t * t;
}

function bezierDerivative(t: number, p1: number, p2: number): number {
  const t1 = 1 - t;
  return 3 * t1 * t1 * p1 + 6 * t1 * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

/** Interpolate between two hex colors in RGB space */
export function lerpColor(hexA: string, hexB: string, t: number): string {
  const r1 = parseInt(hexA.slice(1, 3), 16);
  const g1 = parseInt(hexA.slice(3, 5), 16);
  const b1 = parseInt(hexA.slice(5, 7), 16);
  const r2 = parseInt(hexB.slice(1, 3), 16);
  const g2 = parseInt(hexB.slice(3, 5), 16);
  const b2 = parseInt(hexB.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Map a value from one range to another */
export function mapRange(
  value: number,
  inMin: number, inMax: number,
  outMin: number, outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Round to a given number of decimal places */
export function roundTo(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}
