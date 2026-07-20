/**
 * VideoFrameCache — caches decoded video frames as ImageBitmap per (layerId, frame).
 *
 * When the user scrubs through a video layer, we capture the decoded frame
 * via OffscreenCanvas → createImageBitmap and store it. Subsequent scrubs
 * to the same frame skip the video decode entirely.
 *
 * Uses LRU eviction to stay within a configurable memory budget.
 */
export interface CachedVideoFrame {
  imageBitmap: ImageBitmap;
  byteSize: number;
  lastAccessed: number;
}

export class VideoFrameCache {
  /** layerId → (frameNumber → CachedVideoFrame) */
  private _cache = new Map<string, Map<number, CachedVideoFrame>>();
  private _totalBytes = 0;
  private _maxBytes: number;

  constructor(maxBytes = 256 * 1024 * 1024) {
    this._maxBytes = maxBytes;
  }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(32 * 1024 * 1024, bytes);
    if (this._totalBytes > this._maxBytes) this.trim(this._maxBytes * 0.8);
  }

  get maxBytes(): number { return this._maxBytes; }

  /**
   * Store a decoded video frame bitmap in the cache.
   * @param layerId The video layer ID
   * @param frame The composition frame number
   * @param imageBitmap The decoded frame
   */
  store(layerId: string, frame: number, imageBitmap: ImageBitmap): void {
    let layerCache = this._cache.get(layerId);
    if (!layerCache) {
      layerCache = new Map();
      this._cache.set(layerId, layerCache);
    }

    const byteSize = imageBitmap.width * imageBitmap.height * 4;

    // Remove old entry to avoid double-counting
    const old = layerCache.get(frame);
    if (old) {
      this._totalBytes -= old.byteSize;
      try { old.imageBitmap.close(); } catch {}
    }

    layerCache.set(frame, {
      imageBitmap,
      byteSize,
      lastAccessed: Date.now(),
    });
    this._totalBytes += byteSize;

    if (this._totalBytes > this._maxBytes) {
      this.trim(Math.floor(this._maxBytes * 0.8));
    }
  }

  /**
   * Get a cached frame and update its LRU timestamp.
   * Returns null if not cached.
   */
  get(layerId: string, frame: number): CachedVideoFrame | null {
    const entry = this._cache.get(layerId)?.get(frame);
    if (!entry) return null;
    entry.lastAccessed = Date.now();
    return entry;
  }

  /**
   * Peek at a cached frame WITHOUT updating the LRU timestamp.
   * Use for UI indicators or speculative reads.
   */
  peek(layerId: string, frame: number): CachedVideoFrame | null {
    return this._cache.get(layerId)?.get(frame) ?? null;
  }

  /**
   * Check if a frame is cached.
   */
  has(layerId: string, frame: number): boolean {
    return this._cache.get(layerId)?.has(frame) ?? false;
  }

  /**
   * Invalidate all cached frames for a specific layer.
   */
  invalidateLayer(layerId: string): void {
    const layerCache = this._cache.get(layerId);
    if (!layerCache) return;
    for (const [, entry] of layerCache) {
      this._totalBytes -= entry.byteSize;
      try { entry.imageBitmap.close(); } catch {}
    }
    layerCache.clear();
    this._cache.delete(layerId);
  }

  /**
   * Invalidate all cached frames across all layers.
   */
  invalidateAll(): void {
    for (const [, layerCache] of this._cache) {
      for (const [, entry] of layerCache) {
        this._totalBytes -= entry.byteSize;
        try { entry.imageBitmap.close(); } catch {}
      }
    }
    this._cache.clear();
    this._totalBytes = 0;
  }

  /**
   * LRU eviction: remove oldest-accessed frames until total ≤ targetBytes.
   */
  trim(targetBytes: number): void {
    if (this._totalBytes <= targetBytes) return;

    const allEntries: Array<{
      layerId: string;
      frame: number;
      lastAccessed: number;
      byteSize: number;
    }> = [];

    for (const [layerId, layerCache] of this._cache) {
      for (const [frame, entry] of layerCache) {
        allEntries.push({
          layerId,
          frame,
          lastAccessed: entry.lastAccessed,
          byteSize: entry.byteSize,
        });
      }
    }

    allEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    for (const e of allEntries) {
      if (this._totalBytes <= targetBytes) break;
      const layerCache = this._cache.get(e.layerId);
      if (!layerCache) continue;
      const entry = layerCache.get(e.frame);
      if (entry) {
        this._totalBytes -= entry.byteSize;
        try { entry.imageBitmap.close(); } catch {}
        layerCache.delete(e.frame);
      }
    }

    // Clean up empty layer caches
    for (const [layerId, layerCache] of this._cache) {
      if (layerCache.size === 0) this._cache.delete(layerId);
    }
  }

  getMemoryUsage(): number { return this._totalBytes; }

  get size(): number {
    let count = 0;
    for (const [, layerCache] of this._cache) count += layerCache.size;
    return count;
  }

  dispose(): void {
    for (const [, layerCache] of this._cache) {
      for (const [, entry] of layerCache) {
        try { entry.imageBitmap.close(); } catch {}
      }
    }
    this._cache.clear();
    this._totalBytes = 0;
  }
}
