/**
 * Effect library — central registration point.
 *
 * To add a new effect:
 *   1. Create <name>.ts in this folder exporting an EffectModule.
 *   2. Import it below and append it to ALL_EFFECTS.
 *   3. Add the type name to the EffectType union in src/types/effect.ts.
 *
 * That's the entire process. Do NOT touch EffectChain.ts, EffectsRenderer.ts,
 * or any UI code — everything else is data-driven off the module + registry.
 */
import { effectRegistry } from '../EffectRegistry';
import { effectShaderRegistry } from '../EffectShaderRegistry';
import type { EffectModule } from './types';

// Existing effects
import { gaussianBlurEffect } from './gaussianBlur';
import { boxBlurEffect } from './boxBlur';
import { directionalBlurEffect } from './directionalBlur';
import { radialBlurEffect } from './radialBlur';
import { colorCorrectionEffect } from './colorCorrection';
import { levelsEffect } from './levels';
import { hueSaturationEffect } from './hueSaturation';
import { tintEffect } from './tint';
import { invertEffect } from './invert';
import { thresholdEffect } from './threshold';
import { fillEffect } from './fill';
import { glowEffect } from './glow';
import { dropShadowEffect } from './dropShadow';
import { gradientEffect } from './gradient';
import { waveEffect } from './wave';

export const ALL_EFFECTS: EffectModule[] = [
  gaussianBlurEffect,
  boxBlurEffect,
  directionalBlurEffect,
  radialBlurEffect,
  colorCorrectionEffect,
  levelsEffect,
  hueSaturationEffect,
  tintEffect,
  invertEffect,
  thresholdEffect,
  fillEffect,
  glowEffect,
  dropShadowEffect,
  gradientEffect,
  waveEffect,
];

let _registered = false;

export function registerAllEffects(): void {
  if (_registered) return;
  _registered = true;
  for (const module of ALL_EFFECTS) {
    effectRegistry.register(module.definition);
    effectShaderRegistry.register(module);
  }
}

// Re-export the module type so consumers can import from one place
export type { EffectModule } from './types';