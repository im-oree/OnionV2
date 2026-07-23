/**
 * audioEnvelope — compute the effective volume multiplier at any point in time
 * given fade in / fade out durations and curve types.
 */

export type FadeCurve = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier';

/**
 * Cubic bezier at t (0-1) with control points (x1,y1) and (x2,y2).
 * We use the y-coordinate for envelope shape.
 */
function bezierY(t: number, _x1: number, y1: number, _x2: number, y2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
}

/**
 * Apply a curve to a normalized progress value (0..1 → 0..1).
 */
export function applyFadeCurve(
  progress: number,
  curve: FadeCurve,
  bezier?: [number, number, number, number],
): number {
  const t = Math.max(0, Math.min(1, progress));
  switch (curve) {
    case 'linear':
      return t;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bezier': {
      const [, y1, , y2] = bezier ?? [0.25, 0.1, 0.25, 1];
      // Simple approximation — sample bezier at t
      return bezierY(t, 0, y1, 1, y2);
    }
    default:
      return t;
  }
}

/**
 * Compute the fade envelope multiplier (0..1) at a given timeline second,
 * given segment bounds and fade settings.
 *
 * @param currentSec       Current composition time in seconds
 * @param segStartSec      Segment start time in seconds
 * @param segEndSec        Segment end time in seconds
 * @param fadeIn           Fade in duration in seconds
 * @param fadeOut          Fade out duration in seconds
 * @param fadeInCurve      Curve for fade in
 * @param fadeOutCurve     Curve for fade out
 * @param fadeInBezier     Optional bezier CP for custom fade in
 * @param fadeOutBezier    Optional bezier CP for custom fade out
 * @returns Envelope multiplier 0..1
 */
export function computeFadeEnvelope(
  currentSec: number,
  segStartSec: number,
  segEndSec: number,
  fadeIn: number,
  fadeOut: number,
  fadeInCurve: FadeCurve = 'linear',
  fadeOutCurve: FadeCurve = 'linear',
  fadeInBezier?: [number, number, number, number],
  fadeOutBezier?: [number, number, number, number],
): number {
  if (currentSec < segStartSec || currentSec > segEndSec) return 0;

  const timeIntoSeg = currentSec - segStartSec;
  const timeToEnd = segEndSec - currentSec;
  const segDuration = segEndSec - segStartSec;

  let envelope = 1;

  // Fade in
  if (fadeIn > 0 && timeIntoSeg < fadeIn) {
    const progress = timeIntoSeg / Math.min(fadeIn, segDuration);
    envelope = Math.min(envelope, applyFadeCurve(progress, fadeInCurve, fadeInBezier));
  }

  // Fade out
  if (fadeOut > 0 && timeToEnd < fadeOut) {
    const progress = timeToEnd / Math.min(fadeOut, segDuration);
    envelope = Math.min(envelope, applyFadeCurve(progress, fadeOutCurve, fadeOutBezier));
  }

  return Math.max(0, Math.min(1, envelope));
}