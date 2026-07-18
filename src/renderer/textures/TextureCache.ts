/**
 * TextureCache — manages THREE.Texture instances with reference counting.
 * Loads images and videos, caches by assetId, disposes when refs hit 0.
 */
import * as THREE from 'three';

interface CacheEntry {
  texture: THREE.Texture;
  refCount: number;
  videoElement?: HTMLVideoElement;
}

export class TextureCache {
  private cache = new Map<string, CacheEntry>();

  /** Load an image texture, returns cached if already loaded */
  async loadImage(assetId: string, url: string): Promise<THREE.Texture> {
    const existing = this.cache.get(assetId);
    if (existing) {
      existing.refCount++;
      return existing.texture;
    }

    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(url);
    texture.needsUpdate = true;

    this.cache.set(assetId, { texture, refCount: 1 });
    return texture;
  }

  /** Create a video texture from an HTML video element */
  loadVideo(assetId: string, url: string): { texture: THREE.VideoTexture; video: HTMLVideoElement } {
    const existing = this.cache.get(assetId);
    if (existing && existing.videoElement) {
      existing.refCount++;
      return { texture: existing.texture as THREE.VideoTexture, video: existing.videoElement };
    }

    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.load();

    const texture = new THREE.VideoTexture(video);
    texture.needsUpdate = true;

    this.cache.set(assetId, { texture, refCount: 1, videoElement: video });
    return { texture, video };
  }

  /** Check if an asset is already cached */
  has(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /** Get a cached texture without incrementing ref count */
  get(assetId: string): THREE.Texture | undefined {
    return this.cache.get(assetId)?.texture;
  }

  /** Increment reference count */
  incRef(assetId: string): void {
    const entry = this.cache.get(assetId);
    if (entry) entry.refCount++;
  }

  /** Decrement reference count; disposes texture when refs hit 0 */
  decRef(assetId: string): void {
    const entry = this.cache.get(assetId);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
      this.disposeEntry(assetId);
    }
  }

  /** Dispose all textures */
  clear(): void {
    for (const key of this.cache.keys()) {
      this.disposeEntry(key);
    }
  }

  private disposeEntry(assetId: string): void {
    const entry = this.cache.get(assetId);
    if (!entry) return;
    entry.texture.dispose();
    if (entry.videoElement) {
      entry.videoElement.pause();
      entry.videoElement.src = '';
      entry.videoElement.load();
    }
    this.cache.delete(assetId);
  }
}

/** Singleton instance used by the renderer */
export const textureCache = new TextureCache();
