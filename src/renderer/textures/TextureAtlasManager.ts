/**
 * TextureAtlasManager — Manages a shared texture atlas for small images.
 *
 * Workflow:
 *   1. Image layers register their asset via `registerImage()`.
 *   2. When enough images accumulate, `pack()` triggers bin-packing.
 *   3. The atlas canvas is drawn with all packed images.
 *   4. A THREE.CanvasTexture is uploaded to the GPU.
 *   5. Image layers query `getUV()` and `getAtlasTexture()` for rendering.
 *   6. When images are removed, `unregisterImage()` triggers repacking.
 *
 * Only images ≤ ATLAS_MAX_IMAGE_SIZE are considered for packing.
 * Large images (e.g. 4K photos) stay as individual textures.
 */
import * as THREE from 'three';
import {
  textureAtlasPacker,
  type PackedRect,
  type PackResult,
  ATLAS_MIN_IMAGES,
  ATLAS_MAX_IMAGE_SIZE,
} from './TextureAtlasPacker';

interface AtlasEntry {
  assetId: string;
  width: number;
  height: number;
  url: string;
}

export class TextureAtlasManager {
  private entries = new Map<string, AtlasEntry>();
  private packResult: PackResult | null = null;
  private atlasTexture: THREE.CanvasTexture | null = null;
  private atlasCanvas: HTMLCanvasElement | null = null;
  private atlasCtx: CanvasRenderingContext2D | null = null;
  private _dirty = false;
  private _packing = false;

  /** Callbacks fired when the atlas texture changes (for layer re-renders) */
  private _onAtlasChangedListeners: Array<() => void> = [];
  private _lastPackTime = 0;

  /** Register a listener for atlas changes */
  onAtlasChanged(cb: () => void): () => void {
    this._onAtlasChangedListeners.push(cb);
    return () => {
      const idx = this._onAtlasChangedListeners.indexOf(cb);
      if (idx >= 0) this._onAtlasChangedListeners.splice(idx, 1);
    };
  }

  /** Notify all listeners */
  private _notifyAtlasChanged(): void {
    for (const cb of this._onAtlasChangedListeners) cb();
  }

  /**
   * Register an image for potential atlas packing.
   * Returns true if the image qualifies for atlas packing (small enough).
   */
  registerImage(assetId: string, width: number, height: number, url: string): boolean {
    if (width > ATLAS_MAX_IMAGE_SIZE || height > ATLAS_MAX_IMAGE_SIZE) return false;
    if (this.entries.has(assetId)) return true;

    this.entries.set(assetId, { assetId, width, height, url });
    this._dirty = true;
    return true;
  }

  /** Unregister an image (when layer is deleted or asset changes). */
  unregisterImage(assetId: string): void {
    if (!this.entries.has(assetId)) return;
    this.entries.delete(assetId);
    this._dirty = true;
  }

  /** Check if an image is registered in the atlas system. */
  hasImage(assetId: string): boolean {
    return this.entries.has(assetId);
  }

  /** Check if the atlas has been packed and has a valid texture. */
  isReady(): boolean {
    return this.atlasTexture !== null && this.packResult !== null;
  }

  /** Check if repacking is needed (with cooldown to avoid hammering). */
  get isDirty(): boolean {
    if (!this._dirty) return false;
    // Cooldown: don't repack more than once per 500ms
    const now = performance.now();
    if (now - this._lastPackTime < 500) return false;
    return true;
  }

  /** Get the atlas texture (or null if not packed). */
  getAtlasTexture(): THREE.CanvasTexture | null {
    return this.atlasTexture;
  }

  /** Get UV coordinates for a registered image. Returns null if not packed. */
  getUV(assetId: string): { u0: number; v0: number; u1: number; v1: number } | null {
    if (!this.packResult) return null;
    const rect = this.packResult.rects.find(r => r.assetId === assetId);
    return rect?.uv ?? null;
  }

  /** Get the atlas dimensions. */
  getAtlasSize(): { width: number; height: number } | null {
    if (!this.packResult) return null;
    return { width: this.packResult.atlasWidth, height: this.packResult.atlasHeight };
  }

  /** Get the number of registered images. */
  get registeredCount(): number {
    return this.entries.size;
  }

  /**
   * Pack all registered images into the atlas.
   * Returns true if packing succeeded.
   */
  async pack(): Promise<boolean> {
    if (this._packing) return false;
    if (this.entries.size < ATLAS_MIN_IMAGES) return false;

    this._packing = true;
    this._dirty = false;

    try {
      const requests = Array.from(this.entries.values()).map(e => ({
        assetId: e.assetId,
        width: e.width,
        height: e.height,
      }));

      const result = textureAtlasPacker.pack(requests);
      if (!result) {
        this._packing = false;
        return false;
      }

    this.packResult = result;
    this._lastPackTime = performance.now();

    // Draw all images onto the atlas canvas
    await this._drawAtlas();

    this._packing = false;
    this._notifyAtlasChanged();
    return true;
    } catch (err) {
      console.warn('[TextureAtlasManager] Pack failed:', err);
      this._packing = false;
      return false;
    }
  }

  /**
   * Draw all packed images onto the atlas canvas and create/update the GPU texture.
   */
  private async _drawAtlas(): Promise<void> {
    if (!this.packResult) return;

    const { atlasWidth, atlasHeight, rects } = this.packResult;

    // Create or resize the canvas
    if (!this.atlasCanvas || this.atlasCanvas.width !== atlasWidth || this.atlasCanvas.height !== atlasHeight) {
      this.atlasCanvas = document.createElement('canvas');
      this.atlasCanvas.width = atlasWidth;
      this.atlasCanvas.height = atlasHeight;
      this.atlasCtx = this.atlasCanvas.getContext('2d');
    }

    const ctx = this.atlasCtx;
    if (!ctx) return;

    // Clear the canvas (transparent)
    ctx.clearRect(0, 0, atlasWidth, atlasHeight);

    // Draw each image onto the canvas
    const loadPromises: Promise<void>[] = [];

    for (const rect of rects) {
      const entry = this.entries.get(rect.assetId);
      if (!entry || !entry.url) continue;

      loadPromises.push(this._drawImage(ctx, entry.url, rect));
    }

    await Promise.all(loadPromises);

    // Create or update the GPU texture
    if (!this.atlasTexture) {
      this.atlasTexture = new THREE.CanvasTexture(this.atlasCanvas);
      this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
      this.atlasTexture.minFilter = THREE.LinearFilter;
      this.atlasTexture.magFilter = THREE.LinearFilter;
      this.atlasTexture.generateMipmaps = false;
      this.atlasTexture.flipY = false; // Canvas origin is top-left, same as Three.js default
    } else {
      this.atlasTexture.image = this.atlasCanvas;
    }
    this.atlasTexture.needsUpdate = true;
  }

  /**
   * Draw a single image onto the atlas canvas at the packed position.
   */
  private _drawImage(
    ctx: CanvasRenderingContext2D,
    url: string,
    rect: PackedRect,
  ): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw the image at its packed position
        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
        resolve();
      };
      img.onerror = () => {
        // Draw a magenta placeholder for failed loads
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        resolve();
      };
      img.src = url;
    });
  }

  /**
   * Force a repack (e.g. after adding/removing multiple images).
   * Call this after batch-modifying registrations instead of after each one.
   */
  async repack(): Promise<boolean> {
    this._dirty = true;
    return this.pack();
  }

  /** Dispose the atlas texture and canvas. */
  dispose(): void {
    if (this.atlasTexture) {
      this.atlasTexture.dispose();
      this.atlasTexture = null;
    }
    this.atlasCanvas = null;
    this.atlasCtx = null;
    this.packResult = null;
    this.entries.clear();
    this._dirty = false;
  }
}

/** Singleton instance shared across the renderer */
export const textureAtlasManager = new TextureAtlasManager();
