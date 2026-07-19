/**
 * Easing presets — matches After Effects "Keyframe Assistant" behavior.
 * All tangents are in (x, y) normalized 0..1 space where:
 *   - x = influence (0 = flat/instant, 1 = full stretch)
 *   - y = speed (0 = ease, 1 = linear)
 */
import type { BezierTangent } from '../types/keyframe';

export interface EasingPreset {
  in: BezierTangent;
  out: BezierTangent;
}

/** Linear — straight line, no easing */
export const LINEAR: EasingPreset = {
  in:  { x: 0.333, y: 0.333 },
  out: { x: 0.333, y: 0.333 },
};

/** Easy Ease — 33% influence on both sides, 0 speed (AE F9) */
export const EASY_EASE: EasingPreset = {
  in:  { x: 0.333, y: 0 },
  out: { x: 0.333, y: 0 },
};

/** Ease In — flat approach into the keyframe (AE Shift+F9) */
export const EASE_IN: EasingPreset = {
  in:  { x: 0.333, y: 0 },
  out: { x: 0.333, y: 0.333 },
};

/** Ease Out — flat departure from the keyframe (AE Ctrl+F9) */
export const EASE_OUT: EasingPreset = {
  in:  { x: 0.333, y: 0.333 },
  out: { x: 0.333, y: 0 },
};

/** Fast Ease — snappier motion, tighter curve */
export const FAST_EASE: EasingPreset = {
  in:  { x: 0.15, y: 0 },
  out: { x: 0.15, y: 0 },
};

/** Slow Ease — softer, more gradual */
export const SLOW_EASE: EasingPreset = {
  in:  { x: 0.66, y: 0 },
  out: { x: 0.66, y: 0 },
};

export type EasingPresetName = 'linear' | 'easyEase' | 'easeIn' | 'easeOut' | 'fastEase' | 'slowEase';

export const EASING_PRESETS: Record<EasingPresetName, EasingPreset> = {
  linear: LINEAR,
  easyEase: EASY_EASE,
  easeIn: EASE_IN,
  easeOut: EASE_OUT,
  fastEase: FAST_EASE,
  slowEase: SLOW_EASE,
};

export function getPreset(name: EasingPresetName): EasingPreset {
  return EASING_PRESETS[name];
}