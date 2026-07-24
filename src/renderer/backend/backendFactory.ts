/**
 * backendFactory — DISABLED. WebGPU is currently paused (see TODO).
 * Always returns a WebGL renderer regardless of requested backend.
 * Original implementation kept in git history for future re-enablement.
 */
import * as THREE from 'three';
import type { BackendId, UnifiedRenderer } from './RenderBackend';

export interface CreateRendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
  premultipliedAlpha?: boolean;
}

export interface CreateRendererResult {
  renderer: UnifiedRenderer;
  actualBackend: BackendId;
  fallbackReason?: string;
}

export async function createBackendRenderer(
  backend: BackendId,
  options: CreateRendererOptions = {},
): Promise<CreateRendererResult> {
  const glOpts: THREE.WebGLRendererParameters = {
    antialias: options.antialias ?? true,
    alpha: options.alpha ?? true,
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
    premultipliedAlpha: options.premultipliedAlpha ?? false,
  };

  const renderer = new THREE.WebGLRenderer(glOpts);
  const fallbackReason = backend === 'webgpu'
    ? 'WebGPU is temporarily disabled. Falling back to WebGL.'
    : undefined;

  return {
    renderer: renderer as UnifiedRenderer,
    actualBackend: 'webgl',
    fallbackReason,
  };
}