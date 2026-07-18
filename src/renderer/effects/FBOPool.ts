/**
 * FBOPool — manages a reusable pool of THREE.WebGLRenderTarget instances.
 * Keyed by (width, height) and configured for half-float HDR rendering.
 * Acquired FBOs must be released back when done.
 */
import * as THREE from 'three';

interface PoolKey {
  w: number;
  h: number;
}

class FBOPoolClass {
  private pool = new Map<string, THREE.WebGLRenderTarget[]>();
  private activeCount = 0;

  /** Acquire an FBO. Returns existing one from pool or creates new. */
  acquire(width: number, height: number): THREE.WebGLRenderTarget {
    const key = this._key({ w: Math.ceil(width), h: Math.ceil(height) });
    const available = this.pool.get(key);
    if (available && available.length > 0) {
      this.activeCount++;
      return available.pop()!;
    }

    const fbo = new THREE.WebGLRenderTarget(Math.ceil(width), Math.ceil(height), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.activeCount++;
    return fbo;
  }

  /** Release an FBO back to the pool */
  release(fbo: THREE.WebGLRenderTarget): void {
    const key = this._key({ w: fbo.width, h: fbo.height });
    const available = this.pool.get(key) || [];
    available.push(fbo);
    this.pool.set(key, available);
    this.activeCount--;

    // Auto-shrink: if pool has more than 4 per size, dispose extras
    if (available.length > 4) {
      const extra = available.splice(0, available.length - 4);
      extra.forEach((t) => t.dispose());
    }
  }

  /** Dispose all FBOs */
  dispose(): void {
    for (const targets of this.pool.values()) {
      targets.forEach((t) => t.dispose());
    }
    this.pool.clear();
    this.activeCount = 0;
  }

  get active(): number { return this.activeCount; }

  private _key(k: PoolKey): string {
    return `${k.w}x${k.h}`;
  }
}

export const fboPool = new FBOPoolClass();
