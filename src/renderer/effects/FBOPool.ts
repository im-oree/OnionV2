/**
 * FBOPool — manages reusable THREE.WebGLRenderTarget instances.
 * Effects use normal unsigned-byte RGBA targets for broad compatibility.
 */
import * as THREE from 'three';

interface PoolKey {
  w: number;
  h: number;
}

class FBOPoolClass {
  private pool = new Map<string, THREE.WebGLRenderTarget[]>();
  private activeCount = 0;

  acquire(width: number, height: number): THREE.WebGLRenderTarget {
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    const key = this._key({ w, h });

    const available = this.pool.get(key);
    if (available && available.length > 0) {
      this.activeCount++;
      return available.pop()!;
    }

    const fbo = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    fbo.texture.name = `effect-fbo-${w}x${h}`;
    fbo.texture.colorSpace = THREE.SRGBColorSpace;

    this.activeCount++;
    return fbo;
  }

  release(fbo: THREE.WebGLRenderTarget): void {
    const key = this._key({ w: fbo.width, h: fbo.height });
    const available = this.pool.get(key) || [];
    available.push(fbo);
    this.pool.set(key, available);
    this.activeCount = Math.max(0, this.activeCount - 1);

    if (available.length > 4) {
      const extra = available.splice(0, available.length - 4);
      extra.forEach((t) => t.dispose());
    }
  }

  dispose(): void {
    for (const targets of this.pool.values()) {
      targets.forEach((t) => t.dispose());
    }
    this.pool.clear();
    this.activeCount = 0;
  }

  get active(): number {
    return this.activeCount;
  }

  private _key(k: PoolKey): string {
    return `${k.w}x${k.h}`;
  }
}

export const fboPool = new FBOPoolClass();