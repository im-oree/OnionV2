/**
 * RenderBackend — abstraction layer over WebGL / WebGPU renderers.
 *
 * The rest of the app talks to Three.js directly (renderer.render, etc.),
 * but backend selection, capability queries, and hot-swap logic live here.
 */
import * as THREE from 'three';

export type BackendId = 'webgl' | 'webgpu';

/**
 * Capability flags — features that may or may not be supported by a backend.
 * Effects and layer renderers query these before attempting to render.
 */
export interface BackendCapabilities {
  /** Raw GLSL fragment shaders via ShaderMaterial / RawShaderMaterial */
  rawGLSLShaders: boolean;
  /** User's custom effect shaders (subset of rawGLSLShaders) */
  customEffects: boolean;
  /** WebGL-only post-processing chain (built-in effects library) */
  effectsChain: boolean;
  /** Framebuffer captures via readPixels/readRenderTargetPixels */
  frameBufferCapture: boolean;
  /** MediaRecorder / WebCodecs export */
  exportRecording: boolean;
  /** Motion blur compositor */
  motionBlur: boolean;
  /** DOF post-process */
  depthOfField: boolean;
  /** 3D lights + shadows */
  lightsAndShadows: boolean;
  /** Video textures */
  videoTextures: boolean;
  /** Mask compositing (2D canvas — always available regardless of backend) */
  maskCompositing: boolean;
}

/** WebGL supports everything the app currently uses. */
export const WEBGL_CAPS: BackendCapabilities = {
  rawGLSLShaders: true,
  customEffects: true,
  effectsChain: true,
  frameBufferCapture: true,
  exportRecording: true,
  motionBlur: true,
  depthOfField: true,
  lightsAndShadows: true,
  videoTextures: true,
  maskCompositing: true,
};

/** WebGPU capability set — conservative. Turn things on as we port them. */
export const WEBGPU_CAPS: BackendCapabilities = {
  rawGLSLShaders: false,   // needs TSL conversion
  customEffects: false,    // shader editor emits GLSL
  effectsChain: false,     // depends on rawGLSLShaders
  frameBufferCapture: true,
  exportRecording: true,   // WebCodecs works regardless of backend
  motionBlur: false,       // needs porting
  depthOfField: false,     // needs porting
  lightsAndShadows: true,
  videoTextures: true,
  maskCompositing: true,
};

export function getCapabilities(backend: BackendId): BackendCapabilities {
  return backend === 'webgpu' ? WEBGPU_CAPS : WEBGL_CAPS;
}

/** Detect if the current browser supports WebGPU. */
export async function isWebGPUAvailable(): Promise<boolean> {
  const nav = navigator as any;
  if (!nav.gpu) return false;
  try {
    const adapter = await nav.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/** Human-readable backend labels for UI. */
export const BACKEND_LABELS: Record<BackendId, string> = {
  webgl:  'WebGL',
  webgpu: 'WebGPU (Experimental)',
};

/**
 * A tiny wrapper interface — both WebGLRenderer and WebGPURenderer
 * (from `three/addons/renderers/webgpu/WebGPURenderer.js`) expose almost
 * identical methods, so we just narrow to what the app uses.
 */
export interface UnifiedRenderer {
  domElement: HTMLCanvasElement;
  render(scene: THREE.Scene, camera: THREE.Camera): void | Promise<void>;
  setSize(w: number, h: number, updateStyle?: boolean): void;
  setPixelRatio(r: number): void;
  getPixelRatio(): number;
  setClearColor(color: number | THREE.Color, alpha?: number): void;
  getClearColor(target: THREE.Color): THREE.Color;
  getClearAlpha(): number;
  setViewport(x: number, y: number, w: number, h: number): void;
  setScissor(x: number, y: number, w: number, h: number): void;
  setScissorTest(enable: boolean): void;
  getScissorTest(): boolean;
  clear(color?: boolean, depth?: boolean, stencil?: boolean): void;
  setRenderTarget(target: THREE.WebGLRenderTarget | null): void;
  getRenderTarget(): THREE.WebGLRenderTarget | null;
  readRenderTargetPixels?(target: THREE.WebGLRenderTarget, x: number, y: number, w: number, h: number, buffer: any): void | Promise<void>;
  getSize(target: THREE.Vector2): THREE.Vector2;
  getContext?(): any;
  dispose(): void;
  shadowMap: THREE.WebGLShadowMap;
  /** For WebGPU backend init handshake */
  init?: () => Promise<void>;
}

/**
 * Ask whether a specific effect type is supported on the given backend.
 * All built-in effects require rawGLSLShaders (they're written in GLSL).
 * A future WebGPU-native effect could return true even on WebGPU.
 */
export function isEffectSupportedOn(
  effectType: string,
  backend: BackendId,
): boolean {
  const caps = getCapabilities(backend);
  // All current effects are GLSL — future TSL-based effects would opt in
  // by being listed in a WEBGPU_NATIVE_EFFECTS set below.
  const WEBGPU_NATIVE_EFFECTS = new Set<string>([
    // Add effect types here as they get ported to node-based materials
  ]);
  if (backend === 'webgpu' && WEBGPU_NATIVE_EFFECTS.has(effectType)) return true;
  return caps.rawGLSLShaders;
}