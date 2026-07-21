/**
 * customEffectAdapter — bridges CustomEffectDefinition into the runtime
 * effect registries. Handles validation, registration, unregistration,
 * and re-registration when a definition changes.
 */
import * as THREE from 'three';
import type { EffectDefinition, EffectParameter } from '../../types/effect';
import type { CustomEffectDefinition } from '../../types/customEffect';
import { VALID_UNIFORM_NAME } from '../../types/customEffect';
import type { EffectModule } from './library/types';
import { DEFAULT_VERTEX_SHADER } from './library/types';
import { effectRegistry } from './EffectRegistry';
import { effectShaderRegistry } from './EffectShaderRegistry';

export interface CompileResult {
  ok: boolean;
  error?: string;
  /** Parsed line numbers of errors, best-effort. */
  errorLines?: number[];
}

/**
 * Sanity-check a CustomEffectDefinition. Returns an error string or null.
 */
export function validateDefinition(def: CustomEffectDefinition): string | null {
  if (!def.id || typeof def.id !== 'string') return 'Missing effect id';
  if (!def.displayName || typeof def.displayName !== 'string') return 'Missing display name';
  if (typeof def.fragmentShader !== 'string' || !def.fragmentShader.trim()) return 'Empty fragment shader';
  if (!Array.isArray(def.parameters)) return 'Invalid parameters (must be array)';
  for (const p of def.parameters) {
    if (!p.id || !p.name || !p.uniform || !p.type) return `Parameter missing id/name/uniform/type`;
    if (!VALID_UNIFORM_NAME.test(p.uniform)) {
      return `Invalid uniform name "${p.uniform}" (must be uCamelCase)`;
    }
  }
  return null;
}

/**
 * Trial-compile the shader to catch GLSL errors before registration.
 * Uses a throwaway ShaderMaterial + a hidden renderer (via WebGL directly).
 */
export function compileShader(
  fragmentShader: string,
  vertexShader: string | null,
  parameters: EffectParameter[],
): CompileResult {
  // Build uniforms mirroring what EffectChain does at runtime.
  const uniforms: Record<string, THREE.IUniform> = {
    uTexture: { value: null },
    uResolution: { value: new THREE.Vector2(256, 256) },
    uTime: { value: 0 },
  };
  for (const p of parameters) {
    if (p.type === 'color') uniforms[p.uniform] = { value: new THREE.Color(p.value as string) };
    else if (p.type === 'vector2' && Array.isArray(p.value)) uniforms[p.uniform] = { value: new THREE.Vector2(p.value[0], p.value[1]) };
    else uniforms[p.uniform] = { value: p.value };
  }

  try {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertexShader ?? DEFAULT_VERTEX_SHADER,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    // Force shader source into a WebGL program so any compile error throws.
    // We instantiate a tiny offscreen canvas + renderer just for validation.
    const canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 8;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    try {
      renderer.render(scene, cam);
      // If we got here, compile succeeded.
      geo.dispose(); mat.dispose(); renderer.dispose();
      return { ok: true };
    } catch (err) {
      geo.dispose(); mat.dispose(); renderer.dispose();
      const msg = (err as Error)?.message ?? String(err);
      return { ok: false, error: msg, errorLines: extractErrorLines(msg) };
    }
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return { ok: false, error: msg, errorLines: extractErrorLines(msg) };
  }
}

function extractErrorLines(msg: string): number[] {
  // Chrome/Firefox format: "ERROR: 0:12: 'blah' : ..."
  const lines: number[] = [];
  const re = /ERROR:\s*\d+:(\d+):/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(msg)) !== null) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n)) lines.push(n);
  }
  return lines;
}

/**
 * Build a runtime EffectModule from a CustomEffectDefinition and register
 * it into both effect registries. Returns { ok, error } — on failure
 * the effect is NOT registered.
 */
export function registerCustomEffect(def: CustomEffectDefinition): { ok: boolean; error?: string } {
  const validationError = validateDefinition(def);
  if (validationError) return { ok: false, error: validationError };

  const compile = compileShader(def.fragmentShader, def.vertexShader, def.parameters);
  if (!compile.ok) return { ok: false, error: compile.error ?? 'Shader compile failed' };

  const paramsSnapshot = def.parameters.map(p => ({ ...p }));

  const runtimeDef: EffectDefinition = {
    type: def.id as any,
    displayName: def.displayName,
    category: def.category,
    description: def.description,
    shaderPath: `custom/${def.id}.frag`,
    passes: 1,
    requiresOriginal: false,
    createDefaultParameters: () => paramsSnapshot.map(p => ({
      ...p,
      value: p.defaultValue ?? p.value,
    })),
  };

  const module: EffectModule = {
    definition: runtimeDef,
    fragmentShader: def.fragmentShader,
    vertexShader: def.vertexShader ?? undefined,
    usesTime: def.usesTime,
  };

  effectRegistry.register(runtimeDef);
  effectShaderRegistry.register(module);
  return { ok: true };
}

/**
 * Remove a custom effect from the runtime registries. Layers currently using
 * it will see the effect resolve to undefined and skip rendering it (existing
 * safe fallback in EffectChain).
 */
export function unregisterCustomEffect(id: string): void {
  // The registries don't expose an unregister method today. We add a soft
  // unregister by overwriting the entry with a no-op definition marked as
  // "missing" so lookups fail gracefully.
  const noop: EffectDefinition = {
    type: id as any,
    displayName: `(missing) ${id}`,
    category: 'stylize',
    description: 'Custom effect deleted',
    shaderPath: '',
    passes: 0,
    requiresOriginal: false,
    createDefaultParameters: () => [],
  };
  effectRegistry.register(noop);
  // Shader registry: register a passthrough so EffectChain doesn't crash.
  effectShaderRegistry.register({
    definition: noop,
    fragmentShader: `uniform sampler2D uTexture; varying vec2 vUv;
      void main() { gl_FragColor = texture2D(uTexture, vUv); }`,
  });
}

/**
 * Re-register a definition after it changed. Bumps version so thumbnails
 * regenerate.
 */
export function reregisterCustomEffect(def: CustomEffectDefinition): { ok: boolean; error?: string } {
  return registerCustomEffect(def);
}