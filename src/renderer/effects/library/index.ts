/**
 * Effect library — central registration point.
 *
 * To add a new effect:
 *   1. Create <name>.ts in this folder exporting an EffectModule.
 *   2. Import it below and append it to ALL_EFFECTS.
 *   3. Add the type name to the EffectType union in src/types/effect.ts.
 */
import { effectRegistry } from '../EffectRegistry';
import { effectShaderRegistry } from '../EffectShaderRegistry';
import { timeControlParams } from './types';
import type { EffectModule } from './types';

// Blur & Sharpen
import { gaussianBlurEffect } from './gaussianBlur';
import { boxBlurEffect } from './boxBlur';
import { directionalBlurEffect } from './directionalBlur';
import { radialBlurEffect } from './radialBlur';
import { sharpenEffect } from './sharpen';
import { motionBlurEffect } from './motionBlur';
import { lensBlurEffect } from './lensBlur';

// Color
import { colorCorrectionEffect } from './colorCorrection';
import { levelsEffect } from './levels';
import { hueSaturationEffect } from './hueSaturation';
import { tintEffect } from './tint';
import { invertEffect } from './invert';
import { thresholdEffect } from './threshold';
import { fillEffect } from './fill';
import { chromaKeyEffect } from './chromaKey';
import { tritoneEffect } from './tritone';
import { colorBalanceEffect } from './colorBalance';
import { exposureEffect } from './exposure';
import { vibranceEffect } from './vibrance';
import { curvesEffect } from './curves';
import { posterizeEffect } from './posterize';
import { duotoneEffect } from './duotone';
import { sepiaEffect } from './sepia';
import { solarizeEffect } from './solarize';

// Stylize
import { glowEffect } from './glow';
import { dropShadowEffect } from './dropShadow';
import { vignetteEffect } from './vignette';
import { chromaticAberrationEffect } from './chromaticAberration';
import { bevelAlphaEffect } from './bevelAlpha';
import { cartoonEffect } from './cartoon';
import { glitchEffect } from './glitch';
import { edgeDetectEffect } from './edgeDetect';
import { innerGlowEffect } from './innerGlow';
import { outerGlowEffect } from './outerGlow';
import { strokeEffect } from './stroke';
import { filmGrainEffect } from './filmGrain';
import { feedbackEffect } from './feedback';
import { scanLinesEffect } from './scanLines';
import { badTvEffect } from './badTv';
import { timeEchoEffect } from './timeEcho';
import { crossHatchEffect } from './crossHatch';
import { halftoneEffect } from './halftone';
import { asciiArtEffect } from './asciiArt';
import { embossEffect } from './emboss';
import { deepGlowEffect } from './deepGlow';
import { bloomEffect } from './bloom';
import { mosaicEffect } from './mosaic';
import { roughenEdgesEffect } from './roughenEdges';
import { unsharpMaskEffect } from './unsharpMask';
import { ccLightSweepEffect } from './ccLightSweep';
import { lensFlareEffect } from './lensFlare';
import { radioWavesEffect } from './radioWaves';
import { cameraLensBlurEffect } from './cameraLensBlur';

// Stylize (additional)
import { echoEffect } from './echoEffect';
import { posterizeTimeEffect } from './posterizeTime';

// Distort
import { liquifyEffect } from './liquify';
import { meshWarpEffect } from './meshWarp';
import { waveEffect } from './wave';
import { bulgeEffect } from './bulge';
import { twirlEffect } from './twirl';
import { rippleEffect } from './ripple';
import { turbulentDisplaceEffect } from './turbulentDisplace';
import { lensDistortionEffect } from './lensDistortion';
import { pixelateEffect } from './pixelate';
import { mirrorEffect } from './mirror';
import { kaleidoscopeEffect } from './kaleidoscope';
import { ccSphereEffect } from './ccSphere';
import { displacementMapEffect } from './displacementMap';
import { displacementMap2Effect } from './displacementMap2';

// Generate
import { gradientEffect } from './gradient';
import { noiseEffect } from './noise';
import { fractalNoiseEffect } from './fractalNoise';
import { motionTileEffect } from './motionTile';
import { ccParticleWorldEffect } from './ccParticleWorld';

// Transition
import { radialWipeEffect } from './radialWipe';
import { radialRevealEffect } from './radialReveal';
import { irisRevealEffect } from './irisReveal';

// Keying
import { autoCutoutEffect } from './autoCutout';

// Blend Mode
import { blendModeEffect } from './blendMode';

export const ALL_EFFECTS: EffectModule[] = [
  // Blur & Sharpen
  gaussianBlurEffect, boxBlurEffect, directionalBlurEffect,
  radialBlurEffect, sharpenEffect, motionBlurEffect, lensBlurEffect,
  unsharpMaskEffect, cameraLensBlurEffect,
  // Color
  colorCorrectionEffect, levelsEffect, hueSaturationEffect,
  tintEffect, invertEffect, thresholdEffect, fillEffect,
  chromaKeyEffect, tritoneEffect, colorBalanceEffect,
  exposureEffect, vibranceEffect, curvesEffect, posterizeEffect,
  duotoneEffect, sepiaEffect, solarizeEffect,
  // Stylize
  glowEffect, dropShadowEffect, vignetteEffect, echoEffect,
  chromaticAberrationEffect, bevelAlphaEffect,
  cartoonEffect, glitchEffect, edgeDetectEffect,
  innerGlowEffect, outerGlowEffect, strokeEffect,
  filmGrainEffect, feedbackEffect, scanLinesEffect, badTvEffect, timeEchoEffect,
  crossHatchEffect, halftoneEffect, asciiArtEffect, embossEffect, deepGlowEffect, bloomEffect,
  mosaicEffect, roughenEdgesEffect, posterizeTimeEffect,
  // Distort
  liquifyEffect, meshWarpEffect,
  waveEffect, bulgeEffect, twirlEffect, rippleEffect,
  turbulentDisplaceEffect, lensDistortionEffect,
  pixelateEffect, mirrorEffect, kaleidoscopeEffect,
  ccSphereEffect, displacementMapEffect, displacementMap2Effect,
  // Generate
  gradientEffect, noiseEffect, fractalNoiseEffect, motionTileEffect, ccParticleWorldEffect,
  ccLightSweepEffect, lensFlareEffect, radioWavesEffect,
  // Transition
  radialWipeEffect, radialRevealEffect, irisRevealEffect,
  // Keying
  autoCutoutEffect,
  // Blend Mode
  blendModeEffect,
];

let _registered = false;

export function registerAllEffects(): void {
  if (_registered) return;
  _registered = true;
  for (const module of ALL_EFFECTS) {
    let definition = module.definition;
    if (module.usesTime) {
      const originalCreate = definition.createDefaultParameters;
      const extraParams = timeControlParams();
      definition = {
        ...definition,
        createDefaultParameters: () => [
          ...originalCreate(),
          ...extraParams.filter((ep) => !originalCreate().some((op) => op.id === ep.id)),
        ],
      };
    }
    effectRegistry.register(definition);
    effectShaderRegistry.register({ ...module, definition });
  }
}

export type { EffectModule } from './types';
