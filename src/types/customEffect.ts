/**
 * Custom effect types — user-created GPU effects that persist to the
 * workspace and register at runtime alongside built-in effects.
 *
 * Custom effect IDs are always prefixed with 'custom_' to avoid collisions
 * with built-in EffectType values.
 */
import type { EffectCategory, EffectParameter } from './effect';

export const CUSTOM_EFFECT_ID_PREFIX = 'custom_';
export const CUSTOM_EFFECT_FORMAT_VERSION = 'onionfx-v1';
export const CUSTOM_EFFECT_STORAGE_DIR = '.effects';

export interface CustomEffectDefinition {
  /** Stable id like 'custom_glow_v1'. Never renamed. */
  id: string;
  displayName: string;
  category: EffectCategory;
  description: string;
  author?: string;
  created: number;   // epoch ms
  modified: number;  // epoch ms
  /** Bumped whenever the shader or parameter schema changes.
   *  Used to invalidate any cached thumbnail for this effect. */
  version: number;

  /** True if the shader uses uTime and should get auto-injected time controls. */
  usesTime: boolean;

  /** Default coordinate space when the effect is added to a layer. */
  space?: 'local' | 'screen';

  /** User-authored GLSL fragment shader source. */
  fragmentShader: string;
  /** Optional custom vertex shader. Null = use default. */
  vertexShader: string | null;

  /** User-defined parameter schema. */
  parameters: EffectParameter[];
}

/** On-disk / shareable file format wrapping a CustomEffectDefinition. */
export interface OnionFxFile {
  format: typeof CUSTOM_EFFECT_FORMAT_VERSION;
  definition: CustomEffectDefinition;
}

/** Regex uniform names must match to be accepted from user input. */
export const VALID_UNIFORM_NAME = /^u[A-Z][A-Za-z0-9_]*$/;

/** Default blank shader for newly-created custom effects. Just passes through. */
export const DEFAULT_CUSTOM_FRAGMENT = `// Custom effect — passes the source texture through unchanged.
// Add your GLSL logic below. Available uniforms:
//   uniform sampler2D uTexture;   // input from previous effect / layer
//   uniform vec2      uResolution; // layer pixel size
//   uniform float     uTime;       // seconds (only if 'usesTime' is on)
// Available varyings:
//   varying vec2 vUv;              // 0..1 UVs (vUv.y = 0 is top)

uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;

/** Create a new definition with sensible defaults. */
export function makeDefaultCustomEffect(idSuffix: string, name: string): CustomEffectDefinition {
  const now = Date.now();
  return {
    id: `${CUSTOM_EFFECT_ID_PREFIX}${idSuffix}`,
    displayName: name,
    category: 'stylize',
    description: '',
    created: now,
    modified: now,
    version: 1,
    usesTime: false,
    space: 'local',
    fragmentShader: DEFAULT_CUSTOM_FRAGMENT,
    vertexShader: null,
    parameters: [],
  };
}