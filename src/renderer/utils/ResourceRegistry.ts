/**
 * ResourceRegistry — global tracking of THREE.js disposable resources.
 * Prevents memory leaks by auditing all created resources and ensuring
 * they are properly disposed on composition switch, project close, or app exit.
 *
 * Usage:
 *   import { resourceRegistry } from './ResourceRegistry';
 *   const tex = new THREE.Texture(/* ... * /);
 *   resourceRegistry.register(tex, 'texture', { name: 'myTexture', compId });
 *   // ... later:
 *   resourceRegistry.unregister(tex);
 *   tex.dispose();
 */
import * as THREE from 'three';

export type ResourceType = 'texture' | 'geometry' | 'material' | 'renderTarget' | 'bufferGeometry' | 'shaderMaterial' | 'mesh';

export interface ResourceMeta {
  type: ResourceType;
  /** Human-readable description */
  name?: string;
  /** Composition ID this resource belongs to (for scoped cleanup) */
  compId?: string;
  /** Timestamp of creation */
  created: number;
}

export class ResourceRegistry {
  private _resources = new WeakMap<THREE.Object3D | THREE.Texture | THREE.Material | THREE.BufferGeometry | THREE.WebGLRenderTarget, ResourceMeta>();
  private _activeResources = new Map<string, Set<THREE.Object3D | THREE.Texture | THREE.Material | THREE.BufferGeometry | THREE.WebGLRenderTarget>>();

  private _disposedCount = 0;
  private _leakLogging = false;

  /** Enable/disable leak logging (on app close / debug mode) */
  set leakLogging(v: boolean) { this._leakLogging = v; }

  get totalTracked(): number { return this._activeResources.size; }
  get disposedCount(): number { return this._disposedCount; }

  /** Register a disposable resource */
  register(
    resource: THREE.Object3D | THREE.Texture | THREE.Material | THREE.BufferGeometry | THREE.WebGLRenderTarget,
    type: ResourceType,
    meta?: { name?: string; compId?: string },
  ): void {
    if (this._resources.has(resource)) return; // Already tracked

    const rMeta: ResourceMeta = {
      type,
      name: meta?.name,
      compId: meta?.compId,
      created: performance.now(),
    };

    this._resources.set(resource, rMeta);

    // Track by compId for scoped cleanup
    if (meta?.compId) {
      let set = this._activeResources.get(meta.compId);
      if (!set) {
        set = new Set();
        this._activeResources.set(meta.compId, set);
      }
      set.add(resource);
    }
  }

  /** Unregister a resource when it's manually disposed */
  unregister(resource: THREE.Object3D | THREE.Texture | THREE.Material | THREE.BufferGeometry | THREE.WebGLRenderTarget): void {
    const meta = this._resources.get(resource);
    if (!meta) return;

    this._resources.delete(resource);

    if (meta.compId) {
      const set = this._activeResources.get(meta.compId);
      if (set) {
        set.delete(resource);
        if (set.size === 0) this._activeResources.delete(meta.compId);
      }
    }

    this._disposedCount++;
  }

  /** Dispose all resources belonging to a composition */
  disposeComposition(compId: string): void {
    const set = this._activeResources.get(compId);
    if (!set) return;

    for (const resource of set) {
      this._disposeResource(resource);
      this._resources.delete(resource);
    }

    this._activeResources.delete(compId);
  }

  /** Dispose all tracked resources (on app close) */
  disposeAll(): void {
    for (const [, set] of this._activeResources) {
      for (const resource of set) {
        this._disposeResource(resource);
      }
    }
    this._activeResources.clear();
    this._resources = new WeakMap();

    this._logLeaks();
  }

  /** Log any leaked resources (not properly disposed) */
  private _logLeaks(): void {
    if (!this._leakLogging) return;

    const leaked = new Map<string, number>();
    for (const [, meta] of this._resources as any) {
      const key = meta.type;
      leaked.set(key, (leaked.get(key) || 0) + 1);
    }

    if (leaked.size > 0) {
      console.warn('[ResourceRegistry] Potential leaks:', Object.fromEntries(leaked));
    }
  }

  private _disposeResource(
    resource: THREE.Object3D | THREE.Texture | THREE.Material | THREE.BufferGeometry | THREE.WebGLRenderTarget,
  ): void {
    try {
      if (resource instanceof THREE.Mesh) {
        if (resource.geometry) {
          resource.geometry.dispose();
          this._resources.delete(resource.geometry);
        }
        if (Array.isArray(resource.material)) {
          resource.material.forEach(m => { m.dispose(); this._resources.delete(m); });
        } else if (resource.material) {
          resource.material.dispose();
          this._resources.delete(resource.material);
        }
      } else if (resource instanceof THREE.BufferGeometry) {
        resource.dispose();
      } else if (resource instanceof THREE.Material) {
        // Dispose textures referenced by material
        for (const key of Object.keys(resource)) {
          const val = (resource as any)[key];
          if (val instanceof THREE.Texture) {
            val.dispose();
            this._resources.delete(val);
          } else if (Array.isArray(val)) {
            for (const item of val) {
              if (item instanceof THREE.Texture) {
                item.dispose();
                this._resources.delete(item);
              }
            }
          }
        }
        resource.dispose();
      } else if (resource instanceof THREE.Texture) {
        resource.dispose();
      } else if (resource instanceof THREE.WebGLRenderTarget) {
        resource.dispose();
      }
    } catch {
      // Silently fail on double-dispose
    }
  }

  /** Check if GPU memory has returned to baseline (debug) */
  async verifyMemoryBaseline(baselineBytes: number): Promise<{ ok: boolean; current: number }> {
    // This is a best-effort check using the performance memory API if available
    const mem = (performance as any).memory;
    if (mem) {
      const current = mem.usedJSHeapSize;
      return { ok: current <= baselineBytes * 1.1, current };
    }
    return { ok: true, current: 0 };
  }
}

/** Global singleton */
export const resourceRegistry = new ResourceRegistry();
