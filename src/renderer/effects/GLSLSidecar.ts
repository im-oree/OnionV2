/**
 * GLSLSidecar — a hidden offscreen WebGL renderer that runs GLSL effect
 * chains when the main backend is WebGPU. The rendered result is copied
 * back as a texture that WebGPU can sample.
 *
 * Only created on demand. Zero cost when the main backend is WebGL.
 */
import * as THREE from 'three';

export class GLSLSidecar {
  private _renderer: THREE.WebGLRenderer | null = null;
  private _canvas: HTMLCanvasElement | null = null;

  /** Lazy-init the sidecar renderer. Returns null if creation fails. */
  ensure(): THREE.WebGLRenderer | null {
    if (this._renderer) return this._renderer;
    try {
      this._canvas = document.createElement('canvas');
      this._canvas.width = 1;
      this._canvas.height = 1;
      this._renderer = new THREE.WebGLRenderer({
        canvas: this._canvas,
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
      });
      this._renderer.setPixelRatio(1);
      return this._renderer;
    } catch (err) {
      console.warn('[GLSLSidecar] Failed to create sidecar WebGL context:', err);
      this._renderer = null;
      this._canvas = null;
      return null;
    }
  }

  /** Read back the sidecar canvas as an ImageBitmap for use as a texture. */
  async readAsBitmap(w: number, h: number): Promise<ImageBitmap | null> {
    if (!this._canvas) return null;
    try {
      return await createImageBitmap(this._canvas, {
        premultiplyAlpha: 'none',
        imageOrientation: 'flipY',
      });
    } catch {
      return null;
    }
  }

  /** Resize the sidecar canvas. */
  resize(w: number, h: number): void {
    if (!this._renderer || !this._canvas) return;
    this._renderer.setSize(w, h, false);
  }

  get renderer(): THREE.WebGLRenderer | null { return this._renderer; }
  get canvas(): HTMLCanvasElement | null { return this._canvas; }

  dispose(): void {
    try { this._renderer?.dispose(); } catch {}
    this._renderer = null;
    this._canvas = null;
  }
}

/** App-wide singleton. Created lazily. */
export const glslSidecar = new GLSLSidecar();