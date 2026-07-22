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
import { ccRadialBlurEffect } from './ccRadialBlur';
import { channelBlurEffect } from './channelBlur';
import { bccBlurEffect } from './bccBlur';
import { defocusPrismEffect } from './defocusPrism';
import { opticalFlowBlurEffect } from './opticalFlowBlur';

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
import { ccColorOffsetEffect } from './ccColorOffset';
import { ccColoramaEffect } from './ccColorama';
import { ccCoolWarmEffect } from './ccCoolWarm';
import { blackAndWhiteEffect } from './blackAndWhite';
import { leaveColorEffect } from './leaveColor';
import { channelMixerEffect } from './channelMixer';
import { photoFilterEffect } from './photoFilter';
import { shadowHighlightEffect } from './shadowHighlight';
import { threeWayColorGradeEffect } from './threeWayColorGrade';
import { broadcastSafeEffect } from './broadcastSafe';

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
import { ccGodrayEffect } from './ccGodray';
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
import { ccBendItEffect } from './ccBendIt';
import { ccFloMotionEffect } from './ccFloMotion';
import { ccGriddlerEffect } from './ccGriddler';
import { ccLensEffect } from './ccLens';
import { ccPowerPinEffect } from './ccPowerPin';
import { ccSlantEffect } from './ccSlant';
import { ccSplitEffect } from './ccSplit';
import { ccTilerEffect } from './ccTiler';
import { bendTaperTwistEffect } from './bendTaperTwist';
import { imageShatterEffect } from './imageShatter';
import { distortChromaEffect } from './distortChroma';
import { distortRGBEffect } from './distortRGB';

// Generate
import { gradientEffect } from './gradient';
import { noiseEffect } from './noise';
import { fractalNoiseEffect } from './fractalNoise';
import { motionTileEffect } from './motionTile';
import { ccParticleWorldEffect } from './ccParticleWorld';
import { ccLightBurstEffect } from './ccLightBurst';
import { ccKaleidaEffect } from './ccKaleida';
import { ccRainEffect } from './ccRain';
import { ccSnowEffect } from './ccSnow';
import { checkerboardEffect } from './checkerboard';
import { gridTileEffect } from './gridTile';
import { artistsPosterEffect } from './artistsPoster';
import { chalkEffect } from './chalk';
import { edgeGlowEffect } from './edgeGlow';
import { raysGlowEffect } from './raysGlow';
import { glareEffect } from './glare';
import { glintEffect } from './glint';
import { streaksEffect } from './streaks';
import { bokehLightsEffect } from './bokehLights';
import { flashbulbsEffect } from './flashbulbs';
import { spotlightEffect } from './spotlight';
import { eyeLightEffect } from './eyeLight';
import { superLEDEffect } from './superLED';
import { cloudsEffect } from './clouds';
import { auroraEffect } from './aurora';
import { starfieldEffect } from './starfield';
import { zapsEffect } from './zaps';
import { sparklesEffect } from './sparkles';
import { brickEffect } from './brick';
import { causticsEffect } from './caustics';
import { particleIllusionEffect } from './particleIllusion';
import { alphaProcessEffect } from './alphaProcess';
import { applyModesEffect } from './applyModes';
import { traceryEffect } from './tracery';

// Transition
import { radialWipeEffect } from './radialWipe';
import { radialRevealEffect } from './radialReveal';
import { irisRevealEffect } from './irisReveal';
import { blockDissolveEffect } from './blockDissolve';
import { cardWipeEffect } from './cardWipe';
import { gradientWipeEffect } from './gradientWipe';
import { venetianBlindsEffect } from './venetianBlinds';
import { blobsWipeEffect } from './blobsWipe';
import { rippleDissolveEffect } from './rippleDissolve';
import { tileWipeEffect } from './tileWipe';
import { lightWipeEffect } from './lightWipe';
import { twisterWipeEffect } from './twisterWipe';
import { dissolveGlowEffect } from './dissolveGlow';
import { dissolveDigitalDamageEffect } from './dissolveDigitalDamage';
import { dissolveShakeEffect } from './dissolveShake';
import { dissolvePixelSortEffect } from './dissolvePixelSort';
import { ccPageTurnEffect } from './ccPageTurn';

// Keying
import { autoCutoutEffect } from './autoCutout';
import { linearColorKeyEffect } from './linearColorKey';
import { spillSuppressorEffect } from './spillSuppressor';
import { primatteKeyEffect } from './primatteKey';

// Blend Mode
import { blendModeEffect } from './blendMode';

// Stylize (additional CC)
import { ccBurnFilmEffect } from './ccBurnFilm';
import { ccGlassEffect } from './ccGlass';
import { ccHexagonEffect } from './ccHexagon';
import { ccThresholdRGBEffect } from './ccThresholdRGB';
import { brushStrokesEffect } from './brushStrokes';
import { colorEmbossEffect } from './colorEmboss';
import { scatterEffect } from './scatter';
import { vintageCamEffect } from './vintageCam';
import { damagedFilmEffect } from './damagedFilm';
import { filmBloomEffect } from './filmBloom';
import { grungeEffect } from './grunge';
import { digitalDamageEffect } from './digitalDamage';
import { pixelSortEffect } from './pixelSort';
import { flysEyesHexEffect } from './flysEyesHex';
import { denoiseEffect } from './denoise';
import { deflickerEffect } from './deflicker';
import { scratchRemovalEffect } from './scratchRemoval';
import { stabilizationEffect } from './stabilization';
import { skinSmoothingEffect } from './skinSmoothing';
import { freezeFrameEffect } from './freezeFrame';
import { cartoonLookEffect } from './cartoonLook';
import { haloBurEffect } from './haloBur';
import { cinemaBarsEffect } from './cinemaBars';

export const ALL_EFFECTS: EffectModule[] = [
  // Blur & Sharpen
  gaussianBlurEffect, boxBlurEffect, directionalBlurEffect,
  radialBlurEffect, sharpenEffect, motionBlurEffect, lensBlurEffect,
  unsharpMaskEffect, cameraLensBlurEffect, ccRadialBlurEffect, channelBlurEffect,
  bccBlurEffect, defocusPrismEffect, opticalFlowBlurEffect,
  // Color
  colorCorrectionEffect, levelsEffect, hueSaturationEffect,
  tintEffect, invertEffect, thresholdEffect, fillEffect,
  chromaKeyEffect, tritoneEffect, colorBalanceEffect,
  exposureEffect, vibranceEffect, curvesEffect, posterizeEffect,
  duotoneEffect, sepiaEffect, solarizeEffect,
  ccColorOffsetEffect, ccColoramaEffect, ccCoolWarmEffect,
  blackAndWhiteEffect, leaveColorEffect, channelMixerEffect,
  photoFilterEffect, shadowHighlightEffect,
  threeWayColorGradeEffect, broadcastSafeEffect,
  // Stylize
  glowEffect, dropShadowEffect, vignetteEffect, echoEffect,
  chromaticAberrationEffect, bevelAlphaEffect,
  cartoonEffect, glitchEffect, edgeDetectEffect,
  innerGlowEffect, outerGlowEffect, strokeEffect,
  filmGrainEffect, feedbackEffect, scanLinesEffect, badTvEffect, timeEchoEffect,
  crossHatchEffect, halftoneEffect, asciiArtEffect, embossEffect, deepGlowEffect, bloomEffect,
  mosaicEffect, roughenEdgesEffect, posterizeTimeEffect,
  ccBurnFilmEffect, ccGlassEffect, ccHexagonEffect, ccThresholdRGBEffect,
  brushStrokesEffect, colorEmbossEffect, scatterEffect,
  vintageCamEffect, damagedFilmEffect, filmBloomEffect,
  grungeEffect, digitalDamageEffect, pixelSortEffect, flysEyesHexEffect,
  denoiseEffect, deflickerEffect, scratchRemovalEffect, stabilizationEffect,
  skinSmoothingEffect, freezeFrameEffect, cartoonLookEffect,
  haloBurEffect,
  cinemaBarsEffect,
  // Distort
  liquifyEffect, meshWarpEffect,
  waveEffect, bulgeEffect, twirlEffect, rippleEffect,
  turbulentDisplaceEffect, lensDistortionEffect,
  pixelateEffect, mirrorEffect, kaleidoscopeEffect,
  ccSphereEffect, displacementMapEffect, displacementMap2Effect,
  ccBendItEffect, ccFloMotionEffect, ccGriddlerEffect, ccLensEffect,
  ccPowerPinEffect, ccSlantEffect, ccSplitEffect, ccTilerEffect,
  bendTaperTwistEffect, imageShatterEffect, distortChromaEffect, distortRGBEffect,
  // Generate
  gradientEffect, noiseEffect, fractalNoiseEffect, motionTileEffect, ccParticleWorldEffect,
  ccLightSweepEffect, lensFlareEffect, radioWavesEffect, ccGodrayEffect,
  ccLightBurstEffect, ccKaleidaEffect, ccRainEffect, ccSnowEffect,
  checkerboardEffect, gridTileEffect,
  artistsPosterEffect, chalkEffect,
  edgeGlowEffect, raysGlowEffect, glareEffect, glintEffect, streaksEffect,
  bokehLightsEffect, flashbulbsEffect, spotlightEffect,
  eyeLightEffect, superLEDEffect,
  cloudsEffect, auroraEffect, starfieldEffect, zapsEffect, sparklesEffect,
  brickEffect, causticsEffect,
  particleIllusionEffect, alphaProcessEffect, applyModesEffect, traceryEffect,
  // Transition
  radialWipeEffect, radialRevealEffect, irisRevealEffect,
  blockDissolveEffect, cardWipeEffect, gradientWipeEffect, venetianBlindsEffect,
  blobsWipeEffect, rippleDissolveEffect, tileWipeEffect, lightWipeEffect, twisterWipeEffect,
  dissolveGlowEffect, dissolveDigitalDamageEffect, dissolveShakeEffect, dissolvePixelSortEffect,
  ccPageTurnEffect,
  // Keying
  autoCutoutEffect, linearColorKeyEffect, spillSuppressorEffect, primatteKeyEffect,
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
