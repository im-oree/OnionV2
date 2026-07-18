/**
 * KeyframeEngine — stores and evaluates keyframes for animated properties.
 * Maintains sorted keyframe arrays per (layerId, propertyPath).
 * Uses binary search for O(log n) lookup during evaluation.
 */
import type { Keyframe, InterpolationType, BezierTangent } from '../types/keyframe';
import { lerp, clamp, cubicBezier } from './Interpolators';

type KeyframeMap = Map<string, Keyframe[]>; // propertyPath → sorted keyframes

export class KeyframeEngine {
  private _data = new Map<string, KeyframeMap>(); // layerId → propertyMap

  // ── Mutation ───────────────────────────────────────────
  addKeyframe(layerId: string, keyframe: Keyframe): void {
    let propMap = this._data.get(layerId);
    if (!propMap) {
      propMap = new Map();
      this._data.set(layerId, propMap);
    }
    const arr = propMap.get(keyframe.property) ?? [];
    // Remove existing keyframe at same time for same property
    const filtered = arr.filter((k) => k.time !== keyframe.time);
    filtered.push(keyframe);
    filtered.sort((a, b) => a.time - b.time);
    propMap.set(keyframe.property, filtered);
  }

  removeKeyframe(keyframeId: string): void {
    for (const [, propMap] of this._data) {
      for (const [prop, arr] of propMap) {
        const filtered = arr.filter((k) => k.id !== keyframeId);
        if (filtered.length !== arr.length) {
          if (filtered.length === 0) propMap.delete(prop);
          else propMap.set(prop, filtered);
          return;
        }
      }
    }
  }

  updateKeyframe(keyframeId: string, patch: Partial<Keyframe>): void {
    for (const [, propMap] of this._data) {
      for (const [prop, arr] of propMap) {
        const idx = arr.findIndex((k) => k.id === keyframeId);
        if (idx !== -1) {
          const updated = { ...arr[idx], ...patch };
          // If time changed, re-sort
          if (patch.time !== undefined && patch.time !== arr[idx].time) {
            const filtered = arr.filter((k) => k.id !== keyframeId);
            filtered.push(updated);
            filtered.sort((a, b) => a.time - b.time);
            propMap.set(prop, filtered);
          } else {
            arr[idx] = updated;
          }
          return;
        }
      }
    }
  }

  moveKeyframe(keyframeId: string, newTime: number): void {
    this.updateKeyframe(keyframeId, { time: newTime });
  }

  setInterpolation(keyframeId: string, interpolation: InterpolationType): void {
    this.updateKeyframe(keyframeId, { interpolation });
  }

  removeAllForProperty(layerId: string, property: string): void {
    const propMap = this._data.get(layerId);
    if (propMap) propMap.delete(property);
  }

  clearLayer(layerId: string): void {
    this._data.delete(layerId);
  }

  // ── Query ──────────────────────────────────────────────
  getKeyframesForProperty(layerId: string, property: string): Keyframe[] {
    return this._data.get(layerId)?.get(property) ?? [];
  }

  getAllKeyframesForLayer(layerId: string): Keyframe[] {
    const propMap = this._data.get(layerId);
    if (!propMap) return [];
    const result: Keyframe[] = [];
    for (const arr of propMap.values()) result.push(...arr);
    return result.sort((a, b) => a.time - b.time);
  }

  hasAnimation(layerId: string, property: string): boolean {
    const arr = this._data.get(layerId)?.get(property);
    return arr !== undefined && arr.length > 0;
  }

  getAllAnimatedProperties(layerId: string): string[] {
    const propMap = this._data.get(layerId);
    return propMap ? Array.from(propMap.keys()) : [];
  }

  /** Get total keyframe count across all layers */
  get totalKeyframes(): number {
    let count = 0;
    for (const propMap of this._data.values()) {
      for (const arr of propMap.values()) count += arr.length;
    }
    return count;
  }

  // ── Evaluation ─────────────────────────────────────────
  /**
   * Evaluate a property at a given frame.
   * Returns { value, inKeyframe } where value is the interpolated value
   * and inKeyframe is true if this frame exactly matches a keyframe.
   */
  evaluate(
    layerId: string,
    property: string,
    frame: number,
  ): { value: number | number[]; inKeyframe: boolean } {
    const keyframes = this._data.get(layerId)?.get(property);
    if (!keyframes || keyframes.length === 0) {
      return { value: 0, inKeyframe: false };
    }

    const len = keyframes.length;

    // Before first keyframe → return first value
    if (frame <= keyframes[0].time) {
      return { value: keyframes[0].value, inKeyframe: frame === keyframes[0].time };
    }

    // After last keyframe → return last value
    if (frame >= keyframes[len - 1].time) {
      return { value: keyframes[len - 1].value, inKeyframe: frame === keyframes[len - 1].time };
    }

    // Find surrounding keyframes with binary search
    let lo = 0, hi = len - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (keyframes[mid].time <= frame) lo = mid;
      else hi = mid;
    }

    const prev = keyframes[lo];
    const next = keyframes[hi];

    // Exact match
    if (frame === prev.time) return { value: prev.value, inKeyframe: true };
    if (frame === next.time) return { value: next.value, inKeyframe: true };

    // Hold interpolation
    if (prev.interpolation === 'hold') {
      return { value: prev.value, inKeyframe: false };
    }

    // Linear or bezier interpolation
    const range = next.time - prev.time;
    const t = range > 0 ? (frame - prev.time) / range : 0;

    if (prev.interpolation === 'bezier' && prev.outTangent && next.inTangent) {
      // Cubic bezier interpolation using tangent handles
      const tAdj = solveBezierTime(prev.outTangent, next.inTangent, t);
      return { value: interpolateValue(prev.value, next.value, tAdj), inKeyframe: false };
    }

    // Default: linear
    return { value: interpolateValue(prev.value, next.value, t), inKeyframe: false };
  }

  /** Clear all data */
  clear(): void {
    this._data.clear();
  }
}

// ── Pure helpers ─────────────────────────────────────────

function interpolateValue(a: number | number[], b: number | number[], t: number): number | number[] {
  if (typeof a === 'number' && typeof b === 'number') {
    return lerp(a, b, t);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLen = Math.min(a.length, b.length);
    const result: number[] = [];
    for (let i = 0; i < maxLen; i++) result.push(lerp(a[i], b[i], t));
    return result;
  }
  return t < 0.5 ? a : b;
}

/**
 * Given a linear t (0-1), adjust using bezier tangents to get the eased t.
 * This matches AE's bezier interpolation where the curve shape is defined by
 * the outgoing tangent of the prev keyframe and incoming tangent of the next keyframe.
 */
function solveBezierTime(
  outTangent: BezierTangent,
  inTangent: BezierTangent,
  t: number,
): number {
  // Map tangent handles from abstract space to control points
  // outTangent defines the handle leaving (0,0), inTangent defines handle arriving at (1,1)
  const p1x = outTangent.x;
  const p1y = outTangent.y;
  const p2x = 1 - inTangent.x;
  const p2y = 1 - inTangent.y;

  // Newton-Raphson to find the parameter for this x
  let guess = t;
  for (let i = 0; i < 8; i++) {
    const x = bezierX(guess, p1x, p2x) - t;
    if (Math.abs(x) < 1e-6) break;
    const dx = bezierDX(guess, p1x, p2x);
    if (Math.abs(dx) < 1e-7) break;
    guess -= x / dx;
  }
  guess = clamp(guess, 0, 1);
  return cubicBezier(guess, p1y, p2y);
}

function bezierX(t: number, p1x: number, p2x: number): number {
  const t1 = 1 - t;
  return 3 * t1 * t1 * t * p1x + 3 * t1 * t * t * p2x + t * t * t;
}

function bezierDX(t: number, p1x: number, p2x: number): number {
  const t1 = 1 - t;
  return 3 * t1 * t1 * p1x + 6 * t1 * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
}
