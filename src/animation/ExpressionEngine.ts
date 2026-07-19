/**
 * ExpressionEngine — evaluates AE-style JavaScript expressions on properties.
 * Provides a sandboxed context with math helpers, time, value, and layer info.
 * Uses new Function() for JIT — much faster than eval and scope-safe.
 */

export interface ExpressionContext {
  time: number;                       // current time in seconds
  frame: number;                      // current frame number
  fps: number;                        // composition fps
  value: number | number[];           // original property value at this frame
  layerId: string;
  compWidth: number;
  compHeight: number;
  compDuration: number;
}

export interface CompiledExpression {
  fn: (ctx: ExpressionContext) => number | number[];
  source: string;
  error: string | null;
}

/** Standard math helpers available in expressions (AE-compatible names) */
const MATH_HELPERS = `
  const abs = Math.abs, floor = Math.floor, ceil = Math.ceil, round = Math.round;
  const sin = Math.sin, cos = Math.cos, tan = Math.tan;
  const asin = Math.asin, acos = Math.acos, atan = Math.atan, atan2 = Math.atan2;
  const sqrt = Math.sqrt, pow = Math.pow, exp = Math.exp, log = Math.log;
  const min = Math.min, max = Math.max, PI = Math.PI, E = Math.E;
  const degreesToRadians = (d) => d * PI / 180;
  const radiansToDegrees = (r) => r * 180 / PI;

  const random = (min = 0, max = 1) => min + Math.random() * (max - min);

  const linear = (t, tMin, tMax, value1, value2) => {
    if (value1 === undefined) return t < tMin ? 0 : t > tMax ? 1 : (t - tMin) / (tMax - tMin);
    if (t <= tMin) return value1;
    if (t >= tMax) return value2;
    const p = (t - tMin) / (tMax - tMin);
    if (Array.isArray(value1)) return value1.map((v, i) => v + (value2[i] - v) * p);
    return value1 + (value2 - value1) * p;
  };

  const ease = (t, tMin, tMax, value1, value2) => {
    if (value1 === undefined) { value1 = 0; value2 = 1; tMax = tMax ?? 1; tMin = tMin ?? 0; }
    if (t <= tMin) return value1;
    if (t >= tMax) return value2;
    let p = (t - tMin) / (tMax - tMin);
    p = p * p * (3 - 2 * p); // smoothstep
    if (Array.isArray(value1)) return value1.map((v, i) => v + (value2[i] - v) * p);
    return value1 + (value2 - value1) * p;
  };

  const clamp = (v, minV, maxV) => Math.max(minV, Math.min(maxV, v));

  // Pseudo-random noise using a hash function (deterministic per input)
  const _hash = (n) => {
    let h = Math.sin(n * 12.9898) * 43758.5453123;
    return h - Math.floor(h);
  };
  const noise = (t) => _hash(t) * 2 - 1;

  // Wiggle: random-walk motion around current value
  const wiggle = (freq, amp) => {
    const t = time;
    const steps = Math.floor(t * freq);
    const frac = t * freq - steps;
    const n1 = noise(steps) * amp;
    const n2 = noise(steps + 1) * amp;
    const w = n1 + (n2 - n1) * frac;
    if (Array.isArray(value)) return value.map(v => v + w);
    return value + w;
  };

  // Loop keyframes — takes the current animated value and cycles it
  const loopOut = (type = 'cycle', numKf = 0) => value; // Simplified: engine handles loop
  const loopIn = (type = 'cycle', numKf = 0) => value;

  // Reference thisComp, layer, etc. (minimal AE compat)
  const thisComp = { width: compWidth, height: compHeight, duration: compDuration };
`;

export class ExpressionEngine {
  /** Compile a raw expression string into a runnable function */
  compile(source: string): CompiledExpression {
    try {
      const body = `
        ${MATH_HELPERS}
        const { time, frame, fps, value, layerId, compWidth, compHeight, compDuration } = ctx;
        return (${source});
      `;
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', body) as (ctx: ExpressionContext) => number | number[];
      // Test evaluate to catch runtime errors early
      try {
        fn({
          time: 0, frame: 0, fps: 30, value: 0, layerId: '',
          compWidth: 1920, compHeight: 1080, compDuration: 10,
        });
      } catch (e) {
        return { fn: () => 0, source, error: `Runtime: ${(e as Error).message}` };
      }
      return { fn, source, error: null };
    } catch (e) {
      return { fn: () => 0, source, error: `Syntax: ${(e as Error).message}` };
    }
  }

  /** Evaluate a compiled expression at a specific frame */
  evaluate(compiled: CompiledExpression, ctx: ExpressionContext): number | number[] {
    if (compiled.error) return ctx.value;
    try {
      return compiled.fn(ctx);
    } catch {
      return ctx.value;
    }
  }
}

export const expressionEngine = new ExpressionEngine();