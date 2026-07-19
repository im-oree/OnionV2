/**
 * keyframeWorker — evaluates keyframes for a set of layers at a given frame.
 * Runs KeyframeEngine.evaluateAllLayersAtFrame logic off the main thread.
 *
 * Message format (from WorkerPool):
 *   { id, type: 'keyframe-eval', payload: { frame, layers, keyframes } }
 *
 * Response:
 *   { id, type: 'keyframe-eval', success: true, payload: { results: { [layerId]: { [path]: value } } } }
 */

interface KfPoint {
  time: number;
  value: number | number[];
  interpolation: string;
  outTangent?: { x: number; y: number };
  inTangent?: { x: number; y: number };
}

interface LayerData {
  id: string;
  properties: Record<string, KfPoint[]>;
}

interface EvalRequest {
  id: string;
  type: 'keyframe-eval';
  payload: {
    frame: number;
    layers: LayerData[];
  };
}

function interpolateValue(
  t: number,
  a: KfPoint,
  b: KfPoint,
): number | number[] {
  const span = b.time - a.time;
  if (span <= 0) return a.value;

  let u = (t - a.time) / span; // 0..1

  switch (a.interpolation) {
    case 'hold':
      return a.value;

    case 'linear':
      break; // u stays linear

    case 'ease':
      // Smoothstep
      u = u * u * (3 - 2 * u);
      break;

    case 'ease-in':
      u = u * u;
      break;

    case 'ease-out':
      u = 1 - (1 - u) * (1 - u);
      break;

    case 'bezier': {
      if (a.outTangent && b.inTangent) {
        // Cubic bezier through two tangents
        const p0 = 0, p3 = 1;
        const p1 = a.outTangent.x + (1 - a.outTangent.x) * 0; // simplified
        const p2 = b.inTangent.x;
        // de Casteljau for the x coordinate
        const cx = 3 * p1, bx = 3 * (p2 - p1) - cx, ax = 1 - cx - bx;
        const t2 = u;
        // Solve for t using Newton-Raphson
        let tGuess = u;
        for (let i = 0; i < 5; i++) {
          const tt = tGuess;
          const xt = ((ax * tt + bx) * tt + cx) * tt;
          const dx = (3 * ax * tt + 2 * bx) * tt + cx;
          if (Math.abs(dx) < 1e-6) break;
          tGuess -= (xt - t2) / dx;
        }
        // Evaluate y at tGuess
        const cy = 3 * p1, by = 3 * (p2 - p1) - cy, ay = 1 - cy - by;
        u = ((ay * tGuess + by) * tGuess + cy) * tGuess;
      }
      break;
    }
  }

  // Lerp values
  if (typeof a.value === 'number' && typeof b.value === 'number') {
    return a.value + (b.value - a.value) * u;
  }

  if (Array.isArray(a.value) && Array.isArray(b.value)) {
    const result: number[] = [];
    for (let i = 0; i < Math.min(a.value.length, b.value.length); i++) {
      result.push(a.value[i] + (b.value[i] - a.value[i]) * u);
    }
    return result;
  }

  return a.value;
}

function evaluateLayerAtFrame(frame: number, layer: LayerData): Record<string, { value: number | number[]; inKeyframe: boolean }> {
  const result: Record<string, { value: number | number[]; inKeyframe: boolean }> = {};

  for (const [path, keyframes] of Object.entries(layer.properties)) {
    if (!keyframes || keyframes.length === 0) continue;

    // Sort by time
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);

    // Before first keyframe
    const firstKf = sorted[0];
    const firstTime = firstKf.time;

    if (frame < firstTime || sorted.length === 1) {
      result[path] = { value: firstKf.value, inKeyframe: frame === firstTime };
      continue;
    }

    // After last keyframe
    const lastKf = sorted[sorted.length - 1];
    if (frame > lastKf.time) {
      result[path] = { value: lastKf.value, inKeyframe: false };
      continue;
    }

    // Find surrounding keyframes
    let a = sorted[0], b = sorted[1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (frame >= sorted[i].time && frame <= sorted[i + 1].time) {
        a = sorted[i];
        b = sorted[i + 1];
        break;
      }
    }

    const isExact = frame === a.time || frame === b.time;
    const value = isExact
      ? (frame === a.time ? a.value : b.value)
      : interpolateValue(frame, a, b);

    result[path] = { value, inKeyframe: isExact };
  }

  return result;
}

self.onmessage = (e: MessageEvent<EvalRequest>) => {
  const { id, payload } = e.data;
  const { frame, layers } = payload;

  try {
    const results: Record<string, Record<string, { value: number | number[]; inKeyframe: boolean }>> = {};

    for (const layer of layers) {
      results[layer.id] = evaluateLayerAtFrame(frame, layer);
    }

    self.postMessage({
      id,
      type: 'keyframe-eval',
      success: true,
      payload: { results },
    });
  } catch (err) {
    self.postMessage({
      id,
      type: 'keyframe-eval',
      success: false,
      error: (err as Error).message,
    });
  }
};
