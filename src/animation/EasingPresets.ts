/**
 * Easing presets — extended with bounce, spring, elastic, cycle, and wiggle.
 * All tangents are in (x, y) normalized 0..1 space.
 */
import type { BezierTangent } from '../types/keyframe';

export interface EasingPreset {
  in: BezierTangent;
  out: BezierTangent;
  /** Optional expression for loop/wiggle effects */
  expression?: string;
}

export type EasingPresetName =
  | 'linear' | 'easyEase' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'fastEase' | 'slowEase' | 'snap' | 'smooth'
  | 'bounceIn' | 'bounceOut' | 'bounce'
  | 'spring' | 'elasticIn' | 'elasticOut'
  | 'loopRepeat' | 'loopPingPong' | 'loopOffset' | 'loopContinue'
  | 'wiggle' | 'wiggleSlow' | 'noise';

// Named constants (backward compat)
export const LINEAR: EasingPreset = { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 } };
export const EASY_EASE: EasingPreset = { in: { x: 0.333, y: 0 }, out: { x: 0.333, y: 0 } };
export const EASE_IN: EasingPreset = { in: { x: 0.333, y: 0 }, out: { x: 0.333, y: 0.333 } };
export const EASE_OUT: EasingPreset = { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0 } };
export const FAST_EASE: EasingPreset = { in: { x: 0.15, y: 0 }, out: { x: 0.15, y: 0 } };
export const SLOW_EASE: EasingPreset = { in: { x: 0.66, y: 0 }, out: { x: 0.66, y: 0 } };

export const EASING_PRESETS: Record<string, EasingPreset> = {
  // Basic
  linear:     { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 } },
  easyEase:   { in: { x: 0.333, y: 0 }, out: { x: 0.333, y: 0 } },
  easeIn:     { in: { x: 0.333, y: 0 }, out: { x: 0.333, y: 0.333 } },
  easeOut:    { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0 } },
  easeInOut:  { in: { x: 0.42, y: 0 }, out: { x: 0.42, y: 0 } },
  fastEase:   { in: { x: 0.15, y: 0 }, out: { x: 0.15, y: 0 } },
  slowEase:   { in: { x: 0.66, y: 0 }, out: { x: 0.66, y: 0 } },
  snap:       { in: { x: 0.01, y: 0 }, out: { x: 0.01, y: 1 } },
  smooth:     { in: { x: 0.5, y: 0.5 }, out: { x: 0.5, y: 0.5 } },
  // Bounce
  bounceIn:   { in: { x: 0.6, y: -0.5 }, out: { x: 0.3, y: 1 } },
  bounceOut:  { in: { x: 0.3, y: 0 }, out: { x: 0.6, y: 1.5 } },
  bounce:     { in: { x: 0.5, y: -0.3 }, out: { x: 0.5, y: 1.3 } },
  // Spring / Elastic
  spring:     { in: { x: 0.5, y: -0.8 }, out: { x: 0.5, y: 1.8 } },
  elasticIn:  { in: { x: 0.8, y: -0.6 }, out: { x: 0.2, y: 1.4 } },
  elasticOut: { in: { x: 0.2, y: 0.6 }, out: { x: 0.8, y: -0.4 } },
  // Continuous / Cycle (expressions)
  loopRepeat:    { in: { x: 0.333, y: 0 }, out: { x: 0.333, y: 0 }, expression: 'loopOut("cycle")' },
  loopPingPong:   { in: { x: 0.4, y: 0.2 }, out: { x: 0.4, y: 0.2 }, expression: 'loopOut("pingpong")' },
  loopOffset:     { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 }, expression: 'loopOut("offset")' },
  loopContinue:   { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 }, expression: 'loopOut("continue")' },
  // Wiggle / Noise (expressions)
  wiggle:     { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 }, expression: 'wiggle(3, 50)' },
  wiggleSlow: { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 }, expression: 'wiggle(1, 30)' },
  noise:      { in: { x: 0.333, y: 0.333 }, out: { x: 0.333, y: 0.333 }, expression: 'noise(time * 3) * 50' },
};

export function getPreset(name: string): EasingPreset | undefined {
  return EASING_PRESETS[name];
}

/** SVG preview paths for the visual preset picker */
export const PREVIEW_PATHS: Record<string, string> = {
  linear: 'M4,76 L144,4',
  easyEase: 'M4,76 C54,76 94,4 144,4',
  easeIn: 'M4,76 C4,76 104,4 144,4',
  easeOut: 'M4,76 C44,76 144,4 144,4',
  easeInOut: 'M4,76 C44,76 104,4 144,4',
  fastEase: 'M4,76 C25,76 119,4 144,4',
  slowEase: 'M4,76 C97,76 47,4 144,4',
  snap: 'M4,76 C5,76 143,4 144,4',
  smooth: 'M4,76 C74,76 74,4 144,4',
  bounceIn: 'M4,76 C88,76 50,-38 144,4',
  bounceOut: 'M4,76 C44,76 100,116 144,4',
  bounce: 'M4,76 C74,76 50,-23 144,4',
  spring: 'M4,76 C74,76 74,-61 144,4',
  elasticIn: 'M4,76 C116,76 32,-46 144,4',
  elasticOut: 'M4,76 C32,76 116,-31 144,4',
  loopRepeat: 'M4,76 Q52,4 100,76 Q148,4 196,76',
  loopPingPong: 'M4,76 L40,4 L80,76 L120,4 L144,76',
  loopOffset: 'M4,76 L40,4 L80,68 L120,0 L144,64',
  loopContinue: 'M4,76 L144,4 L284,-68',
  wiggle: 'M4,40 Q20,10 36,40 Q52,70 68,40 Q84,10 100,40 Q116,70 132,40 L144,40',
  wiggleSlow: 'M4,40 Q36,20 72,40 Q108,60 144,40',
  noise: 'M4,50 L20,30 L36,55 L52,25 L68,60 L84,20 L100,45 L116,35 L132,50 L144,40',
};

/** Categories for the visual picker */
export const PRESET_CATEGORIES = [
  { id: 'basic', label: 'Basic', icon: '~' },
  { id: 'bounce', label: 'Bounce', icon: '⤵' },
  { id: 'spring', label: 'Spring', icon: '⌇' },
  { id: 'elastic', label: 'Elastic', icon: '〰' },
  { id: 'cycle', label: 'Cycle', icon: '↻' },
  { id: 'wiggle', label: 'Wiggle', icon: '〰' },
];

/** Map category to preset names */
export const CATEGORY_PRESETS: Record<string, string[]> = {
  basic: ['linear', 'easyEase', 'easeIn', 'easeOut', 'easeInOut', 'fastEase', 'slowEase', 'snap', 'smooth'],
  bounce: ['bounceIn', 'bounceOut', 'bounce'],
  spring: ['spring'],
  elastic: ['elasticIn', 'elasticOut'],
  cycle: ['loopRepeat', 'loopPingPong', 'loopOffset', 'loopContinue'],
  wiggle: ['wiggle', 'wiggleSlow', 'noise'],
};

/** Display labels for presets */
export const PRESET_LABELS: Record<string, string> = {
  linear: 'Linear', easyEase: 'Ease', easeIn: 'Ease In', easeOut: 'Ease Out',
  easeInOut: 'Ease In-Out', fastEase: 'Fast', slowEase: 'Slow',
  snap: 'Snap', smooth: 'Smooth',
  bounceIn: 'Bounce In', bounceOut: 'Bounce Out', bounce: 'Bounce',
  spring: 'Spring', elasticIn: 'Elastic In', elasticOut: 'Elastic Out',
  loopRepeat: 'Repeat', loopPingPong: 'Ping Pong',
  loopOffset: 'Offset', loopContinue: 'Continue',
  wiggle: 'Wiggle', wiggleSlow: 'Slow Wiggle', noise: 'Noise',
};