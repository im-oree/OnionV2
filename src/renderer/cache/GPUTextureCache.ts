/**
 * GPUTextureCache — stores rendered frames as THREE.Texture objects
 * so they can be displayed WITHOUT any CPU-side readPixels -> canvas ->
 * ImageBitmap -> CanvasTexture round-trip.
 *
 * Textures are created via copyFramebufferToTexture right after each
 * cache-build render while the framebuffer still has the content.
 *
 * When _displayCachedFrame runs, it checks this cache FIRST.  On a hit
 * it swaps the quad material's map to the GPU texture directly —
 * zero CPU work, exactly one glCopyTexSubImage2D per frame ever.
 */
import * as THREE from 'three';

export class GPUTextureCache {
  /** compId → (frameNumber → THREE.Texture) */
  private _cache = new Map<string, Map<number, THREE.Texture>>();

  /**
   * Copy the default framebuffer into a new texture and store it.
   * The framebuffer must still contain the frame we just rendered.
   */
  capture(renderer: THREE.WebGLRenderer, w: number, h: number, compId: string, frame: number): void {
    // Dispose any existing texture for this slot
    this.delete(compId, frame);

    // Create a DataTexture with uninitialised data.  This triggers
    // the WebGL texture allocation (texImage2D) so the texture has a
    // valid gl object that copyFramebufferToTexture can target.
    const buf = new Uint8Array(w * h * 4);
    const tex = new THREE.DataTexture(buf, w, h, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    // No mipmaps — cached frames are displayed 1:1
    tex.generateMipmaps = false;

    // Allocate the WebGL texture object in Three.js's internal bookkeeping
    tex.needsUpdate = true;

    // Copy the current (default) framebuffer content into the texture
    renderer.copyFramebufferToTexture(tex, new THREE.Vector2(0, 0));

    // Store in cache
    let compCache = this._cache.get(compId);
    if (!compCache) {
      compCache = new Map();
      this._cache.set(compId, compCache);
    }
    compCache.set(frame, tex);
  }

  /** Retrieve a cached GPU texture, or null if not present. */
  get(compId: string, frame: number): THREE.Texture | null {
    return this._cache.get(compId)?.get(frame) ?? null;
  }

  delete(compId: string, frame: number): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;
    const tex = compCache.get(frame);
    if (tex) {
      tex.dispose();
      compCache.delete(frame);
    }
  }

  invalidateAll(compId: string): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;
    for (const tex of compCache.values()) tex.dispose();
    compCache.clear();
  }

  invalidateAllCompositions(): void {
    for (const [id] of this._cache) this.invalidateAll(id);
  }

  clear(): void {
    for (const [, compCache] of this._cache) {
      for (const tex of compCache.values()) tex.dispose();
    }
    this._cache.clear();
  }

  dispose(): void { this.clear(); }
}
