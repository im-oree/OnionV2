/**
 * VideoFrameCache — caches decoded video frames as ImageBitmap per (layerId, frame).
 *
 * LRU eviction within configurable memory budget.
 */
export interface CachedVideoFrame {
  imageBitmap: ImageBitmap;
  byteSize: number;
  lastAccessed: number;
}

export class VideoFrameCache {
  private _cache = new Map<string, Map<number, CachedVideoFrame>>();
  private _totalBytes = 0;
  private _maxBytes: number;

  constructor(maxBytes = 256 * 1024 * 1024) {
    this._maxBytes = Math.max(32 * 1024 * 1024, maxBytes);
  }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(32 * 1024 * 1024, bytes);
    if (this._totalBytes > this._maxBytes) {
      this.trim(Math.floor(this._maxBytes * 0.8));
    }
  }

  get maxBytes(): number { return this._maxBytes; }

  store(
    layerId: string,
    frame: number,
    imageBitmap: ImageBitmap,
  ): void {
    if (!layerId || !Number.isFinite(frame)) return;

    let layerCache = this._cache.get(layerId);
    if (!layerCache) {
      layerCache = new Map();
      this._cache.set(layerId, layerCache);
    }

    const byteSize = Math.max(
      0,
      imageBitmap.width * imageBitmap.height * 4,
    );

    const old = layerCache.get(frame);
    if (old) {
      this._totalBytes = Math.max(
        0,
        this._totalBytes - old.byteSize,
      );
      try { old.imageBitmap.close(); } catch {}
    }

    layerCache.set(frame, {
      imageBitmap,
      byteSize,
      lastAccessed: performance.now(),
    });

    this._totalBytes += byteSize;

    if (this._totalBytes > this._maxBytes) {
      this.trim(Math.floor(this._maxBytes * 0.8));
    }
  }

  get(layerId: string, frame: number): CachedVideoFrame | null {
    const entry = this._cache.get(layerId)?.get(frame);
    if (!entry) return null;

    entry.lastAccessed = performance.now();
    return entry;
  }

  peek(layerId: string, frame: number): CachedVideoFrame | null {
    return this._cache.get(layerId)?.get(frame) ?? null;
  }

  has(layerId: string, frame: number): boolean {
    return this._cache.get(layerId)?.has(frame) ?? false;
  }

  invalidateLayer(layerId: string): void {
    const layerCache = this._cache.get(layerId);
    if (!layerCache) return;

    for (const entry of layerCache.values()) {
      this._totalBytes = Math.max(
        0,
        this._totalBytes - entry.byteSize,
      );
      try { entry.imageBitmap.close(); } catch {}
    }

    layerCache.clear();
    this._cache.delete(layerId);
  }

  invalidateAll(): void {
    for (const layerCache of this._cache.values()) {
      for (const entry of layerCache.values()) {
        try { entry.imageBitmap.close(); } catch {}
      }
    }

    this._cache.clear();
    this._totalBytes = 0;
  }

  trim(targetBytes: number): void {
    if (!Number.isFinite(targetBytes)) return;
    if (this._totalBytes <= targetBytes) return;

    const allEntries: Array<{
      layerId: string;
      frame: number;
      lastAccessed: number;
    }> = [];

    for (const [layerId, layerCache] of this._cache) {
      for (const [frame, entry] of layerCache) {
        allEntries.push({
          layerId,
          frame,
          lastAccessed: entry.lastAccessed,
        });
      }
    }

    allEntries.sort(
      (a, b) => a.lastAccessed - b.lastAccessed,
    );

    for (const e of allEntries) {
      if (this._totalBytes <= targetBytes) break;

      const layerCache = this._cache.get(e.layerId);
      const entry = layerCache?.get(e.frame);
      if (!entry) continue;

      this._totalBytes = Math.max(
        0,
        this._totalBytes - entry.byteSize,
      );
      try { entry.imageBitmap.close(); } catch {}
      layerCache.delete(e.frame);

      if (layerCache.size === 0) {
        this._cache.delete(e.layerId);
      }
    }
  }

  getMemoryUsage(): number { return this._totalBytes; }

  get size(): number {
    let count = 0;
    for (const layerCache of this._cache.values()) {
      count += layerCache.size;
    }
    return count;
  }

  dispose(): void {
    for (const layerCache of this._cache.values()) {
      for (const entry of layerCache.values()) {
        try { entry.imageBitmap.close(); } catch {}
      }
    }

    this._cache.clear();
    this._totalBytes = 0;
  }
}