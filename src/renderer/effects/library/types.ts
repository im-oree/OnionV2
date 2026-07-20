/**
 * Effect module — the self-contained unit for one effect.
 *
 * Each effect lives in its own file and exports an EffectModule. The module
 * combines the registry definition (metadata + parameters) with the GPU
 * implementation (shader source, custom render hook if needed).
 *
 * To add a new effect:
 *   1. Create src/renderer/effects/library/<name>.ts exporting an EffectModule
 *   2. Add it to the ALL_EFFECTS array in src/renderer/effects/library/index.ts
 *   3. Add the type name to the EffectType union in src/types/effect.ts
 *
 * That's it — the properties panel, keyframing, library thumbnail, and
 * local/screen space toggle all pick it up automatically.
 */
import type * as THREE from 'three';
import type {
  EffectDefinition,
  EffectInstance,
  EffectParameter,
  EffectType,
  EffectCategory,
} from '../../../types/effect';

export const DEFAULT_VERTEX_SHADER = `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Context passed to a customRender hook.
 * The hook is responsible for rendering into `writeTarget` from `readTexture`
 * using whatever number of passes it needs. It must NOT release/dispose the
 * targets — the EffectChain owns them.
 */
export interface EffectRenderContext {
  renderer: THREE.WebGLRenderer;
  instance: EffectInstance;
  /** Source texture for this effect (output of previous effect, or layer source). */
  readTexture: THREE.Texture;
  /** Target to render final output into. */
  writeTarget: THREE.WebGLRenderTarget;
  /** Layer's pixel bounds. */
  width: number;
  height: number;
  /** Current composition time in seconds — for animated effects (ripple, noise, etc.) */
  currentTime: number;
  /**
   * Get (or create + cache) a ShaderMaterial keyed by (effect instance id + subKey).
   * subKey lets an effect cache multiple materials, e.g. horizontal + vertical
   * passes of a separable blur.
   */
  getMaterial: (
    subKey: string,
    fragmentShader: string,
    uniforms?: Record<string, THREE.IUniform>,
  ) => THREE.ShaderMaterial;
  /**
   * Get a scratch render target sized w×h from the chain's transient pool.
   * The chain reuses these — do NOT dispose. They're valid only for the
   * duration of this customRender call.
   */
  acquireScratch: (w: number, h: number) => THREE.WebGLRenderTarget;
  /**
   * Render `material` (a fullscreen quad shader) into `target`.
   */
  renderPass: (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) => void;
}

export interface EffectModule {
  /** Registry metadata — same shape as EffectDefinition. */
  definition: EffectDefinition;
  /**
   * Fragment shader for the standard single-pass case. If `customRender` is
   * defined, this is ignored.
   */
  fragmentShader?: string;
  /** Optional custom vertex shader. Defaults to DEFAULT_VERTEX_SHADER. */
  vertexShader?: string;
  /**
   * Optional per-effect render hook. Use this for multi-pass effects
   * (separable blurs, glow with bright pass + blur + composite, etc.) or
   * effects that need special GPU state. If omitted, the standard
   * single-pass path uses `fragmentShader`.
   */
  customRender?: (ctx: EffectRenderContext) => void;
  /** If true, the registerAllEffects helper adds uTime param automatically. */
  usesTime?: boolean;
}

/**
 * Helper to build an EffectParameter with sensible defaults. Reduces
 * boilerplate in individual effect files.
 */
export function param(overrides: Partial<EffectParameter> & { id: string; name: string }): EffectParameter {
  const uniform = overrides.uniform ?? `u${overrides.id.charAt(0).toUpperCase() + overrides.id.slice(1)}`;
  const defaultValue = overrides.defaultValue ?? overrides.value ?? 0;
  return {
    type: 'number',
    value: defaultValue,
    defaultValue,
    uniform,
    ...overrides,
  } as EffectParameter;
}

/**
 * Helper to build an EffectDefinition. Reduces boilerplate.
 */
/**
 * Return the standard time-control param used by animated effects.
 * Imported dynamically in registerAllEffects to avoid circular deps.
 */
export function timeControlParams(): EffectParameter[] {
  return [
    param({ id: 'uTime', name: 'Time', value: 0, uniform: 'uTime' }),
  ];
}

export function def(
  type: EffectType,
  displayName: string,
  category: EffectCategory,
  description: string,
  passes: number,
  params: EffectParameter[],
): EffectDefinition {
  return {
    type,
    displayName,
    category,
    description,
    shaderPath: `effects/${category}/${type}.frag`,
    passes,
    requiresOriginal: false,
    createDefaultParameters: () => params.map((p) => ({ ...p, value: p.defaultValue })),
  };
}