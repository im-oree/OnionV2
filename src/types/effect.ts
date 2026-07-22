/**
 * Phase 5: Complete effect type definitions.
 * Each effect has a registry key, display name, category, parameter schema, and shader reference.
 */

/** Unique effect type identifier */
export type EffectType =
  // Blur
  | 'gaussianBlur' | 'boxBlur' | 'directionalBlur' | 'radialBlur' | 'sharpen'
  | 'motionBlur' | 'lensBlur' | 'cameraLensBlur'
  | 'unsharpMask' | 'cameraLensBlur' | 'ccRadialBlur' | 'channelBlur' | 'bccBlur' | 'defocusPrism' | 'opticalFlowBlur'
  // Color
  | 'colorCorrection' | 'levels' | 'hueSaturation' | 'tint' | 'invert'
  | 'threshold' | 'fill' | 'chromaKey' | 'tritone' | 'colorBalance'
  | 'exposure' | 'vibrance' | 'curves' | 'posterize'
  | 'duotone' | 'sepia' | 'solarize'
  | 'ccColorOffset' | 'ccColorama' | 'ccCoolWarm' | 'blackAndWhite' | 'leaveColor'
  | 'channelMixer' | 'photoFilter' | 'shadowHighlight' | 'threeWayColorGrade' | 'broadcastSafe'
  // Stylize
  | 'cinemaBars'
  | 'glow' | 'dropShadow' | 'vignette' | 'chromaticAberration' | 'bevelAlpha'
  | 'cartoon' | 'glitch' | 'edgeDetect' | 'innerGlow' | 'outerGlow' | 'stroke'
  | 'filmGrain' | 'feedback' | 'scanLines' | 'badTv' | 'timeEcho'
  | 'crossHatch' | 'halftone' | 'asciiArt'  | 'emboss'
  | 'deepGlow' | 'bloom'
  | 'mosaic' | 'roughenEdges' | 'echo' | 'posterizeTime'
  | 'ccBurnFilm' | 'ccGlass' | 'ccHexagon' | 'ccThresholdRGB'
  | 'brushStrokes' | 'colorEmboss' | 'scatter'
  | 'vintageCam' | 'damagedFilm' | 'filmBloom'
  | 'grunge' | 'digitalDamage' | 'pixelSort' | 'flysEyesHex'
  | 'denoise' | 'deflicker' | 'scratchRemoval' | 'stabilization'
  | 'skinSmoothing' | 'freezeFrame' | 'cartoonLook'
  // Distort
  | 'liquify' | 'meshWarp'
  | 'wave' | 'bulge' | 'twirl' | 'ripple' | 'turbulentDisplace'
  | 'lensDistortion' | 'pixelate' | 'mirror' | 'kaleidoscope'
  | 'ccSphere' | 'displacementMap' | 'displacementMap2'
  | 'ccBendIt' | 'ccFloMotion' | 'ccGriddler' | 'ccLens' | 'ccPowerPin' | 'ccSlant' | 'ccSplit' | 'ccTiler'
  | 'bendTaperTwist' | 'imageShatter' | 'distortChroma' | 'distortRGB'
  // Generate
  | 'gradient' | 'noise' | 'fractalNoise' | 'motionTile'
  | 'ccLightSweep' | 'lensFlare' | 'radioWaves' | 'ccParticleWorld' | 'ccGodray'
  | 'ccLightBurst' | 'ccKaleida' | 'ccRain' | 'ccSnow' | 'checkerboard' | 'gridTile'
  | 'artistsPoster' | 'chalk'
  | 'edgeGlow' | 'raysGlow' | 'glare' | 'glint' | 'streaks' | 'bokehLights' | 'flashbulbs' | 'spotlight' | 'eyeLight' | 'superLED' | 'haloBur'
  | 'clouds' | 'aurora' | 'starfield' | 'zaps' | 'sparkles' | 'brick' | 'caustics'
  | 'particleIllusion' | 'alphaProcess' | 'applyModes' | 'tracery'
  // Transition
  | 'radialWipe' | 'radialReveal' | 'irisReveal'
  | 'blockDissolve' | 'cardWipe' | 'gradientWipe' | 'venetianBlinds'
  | 'blobsWipe' | 'rippleDissolve' | 'tileWipe' | 'lightWipe' | 'twisterWipe'
  | 'dissolveGlow' | 'dissolveDigitalDamage' | 'dissolveShake' | 'dissolvePixelSort'
  | 'ccPageTurn'
  // Keying
  | 'autoCutout' | 'linearColorKey' | 'spillSuppressor' | 'primatteKey'
  // Blend Mode
  | 'blendMode';

export type EffectCategory = 'blur' | 'color' | 'stylize' | 'distort' | 'generate' | 'transition' | 'blend' | 'blurSharpen' | 'keying';

/** Runtime parameter value for a single effect parameter */
export interface EffectParameter {
  id: string;
  name: string;
  type: 'number' | 'color' | 'boolean' | 'select' | 'vector2' | 'percent' | 'angle' | 'layerRef';
  value: number | string | boolean | [number, number];
  defaultValue: number | string | boolean | [number, number];
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  /** GLSL uniform name in the fragment shader */
  uniform: string;
}

export type EffectSpace = 'local' | 'screen';

/** A single effect instance attached to a layer */
export interface EffectInstance {
  id: string;
  type: EffectType;
  name: string;
  enabled: boolean;
  collapsed: boolean;
  parameters: EffectParameter[];
  /** Coordinate space the effect operates in. Defaults to 'local'.
   *  - local:  applied to source pixels BEFORE transform. Blur radius = source pixels.
   *  - screen: applied to layer's composited output AFTER transform. Blur radius = screen pixels. */
  space?: EffectSpace;
}

/** Registered effect metadata */
export interface EffectDefinition {
  type: EffectType;
  displayName: string;
  category: EffectCategory;
  description: string;
  /** Path to fragment shader relative to /public/shaders/ */
  shaderPath: string;
  /** Number of render passes (2 for two-pass blurs, etc.) */
  passes: number;
  /** Whether this effect needs the unprocessed source texture */
  requiresOriginal: boolean;
  /** Factory function to create default parameters */
  createDefaultParameters: () => EffectParameter[];
}
