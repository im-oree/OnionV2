/**
 * FrameCache — per-composition frame cache with LRU eviction.
 * Stores rendered frames as ImageBitmaps (GPU-backed, fast to draw).
 *
 * IMPORTANT: Use peek() for UI/indicator reads to avoid poisoning LRU timestamps.
 * Use get() only when actually displaying a frame.
 */
export type CacheQuality = 'full' | 'half' | 'quarter';

export interface CachedFrame {
  imageBitmap: ImageBitmap;
  byteSize: number;
  lastAccessed: number;
  quality: CacheQuality;
}

export class FrameCache {
  /** compId → (frameNumber → CachedFrame) */
  private _cache = new Map<string, Map<number, CachedFrame>>();
  private _totalBytes = 0;
  private _maxBytes: number;

  static defaultMaxBytes(): number {
    const deviceMem = (navigator as any).deviceMemory;
    const systemMem = deviceMem
      ? deviceMem * 1024 * 1024 * 1024
      : 4 * 1024 * 1024 * 1024;
    return Math.min(2 * 1024 * 1024 * 1024, Math.floor(systemMem * 0.25));
  }

  constructor(maxBytes?: number) {
    this._maxBytes = maxBytes ?? FrameCache.defaultMaxBytes();
  }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(64 * 1024 * 1024, bytes);
    if (this._totalBytes > this._maxBytes) this.trim(this._maxBytes);
  }

  get maxBytes(): number { return this._maxBytes; }

  store(
    compId: string,
    frame: number,
    imageBitmap: ImageBitmap,
    quality: CacheQuality,
  ): void {
    let compCache = this._cache.get(compId);
    if (!compCache) {
      compCache = new Map();
      this._cache.set(compId, compCache);
    }

    const byteSize = imageBitmap.width * imageBitmap.height * 4;

    // Remove old entry to avoid double-counting
    const old = compCache.get(frame);
    if (old) {
      this._totalBytes -= old.byteSize;
      // Don't close old bitmap here — caller may still hold a reference
      // Only close during eviction when we know no one else holds it
    }

    compCache.set(frame, {
      imageBitmap,
      byteSize,
      lastAccessed: Date.now(),
      quality,
    });
    this._totalBytes += byteSize;

    if (this._totalBytes > this._maxBytes) {
      this.trim(Math.floor(this._maxBytes * 0.8));
    }
  }

  /**
   * Get a frame and update its LRU timestamp.
   * Use ONLY when actually rendering/displaying the frame.
   * For UI indicators, use peek() instead.
   */
  get(compId: string, frame: number): CachedFrame | null {
    const entry = this._cache.get(compId)?.get(frame);
    if (!entry) return null;
    entry.lastAccessed = Date.now();
    return entry;
  }

  /**
   * Read a frame WITHOUT updating the LRU timestamp.
   * Use this for cache indicators, coverage checks, and any
   * read that isn't actually displaying the frame — otherwise
   * every UI poll would reset eviction order for all frames.
   */
  peek(compId: string, frame: number): CachedFrame | null {
    return this._cache.get(compId)?.get(frame) ?? null;
  }

  has(compId: string, frame: number, minQuality?: CacheQuality): boolean {
    const entry = this.peek(compId, frame);
    if (!entry) return false;
    if (!minQuality) return true;
    const order: CacheQuality[] = ['full', 'half', 'quarter'];
    return order.indexOf(entry.quality) <= order.indexOf(minQuality);
  }

  invalidate(compId: string, fromFrame?: number, toFrame?: number): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;
    if (fromFrame === undefined || toFrame === undefined) {
      this.invalidateAll(compId);
      return;
    }
    for (let f = fromFrame; f <= toFrame; f++) {
      const entry = compCache.get(f);
      if (entry) {
        this._totalBytes -= entry.byteSize;
        try { entry.imageBitmap.close(); } catch {}
        compCache.delete(f);
      }
    }
  }

  invalidateAll(compId: string): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;
    for (const [, entry] of compCache) {
      this._totalBytes -= entry.byteSize;
      try { entry.imageBitmap.close(); } catch {}
    }
    compCache.clear();
  }

  invalidateAllCompositions(): void {
    for (const [id] of this._cache) this.invalidateAll(id);
  }

  getRange(
    compId: string,
    startFrame: number,
    endFrame: number,
  ): Map<number, CachedFrame> {
    const compCache = this._cache.get(compId);
    if (!compCache) return new Map();
    const result = new Map<number, CachedFrame>();
    for (let f = startFrame; f <= endFrame; f++) {
      const entry = compCache.get(f);
      if (entry) result.set(f, entry);
    }
    return result;
  }

  /** Fraction (0–1) of frames cached in the given range */
  getCoverage(compId: string, startFrame: number, endFrame: number): number {
    const compCache = this._cache.get(compId);
    if (!compCache || startFrame >= endFrame) return 0;
    let cached = 0;
    const total = endFrame - startFrame + 1;
    for (let f = startFrame; f <= endFrame; f++) {
      if (compCache.has(f)) cached++;
    }
    return cached / total;
  }

  getMemoryUsage(): number { return this._totalBytes; }

  /** LRU eviction: remove oldest-accessed frames until total ≤ targetBytes */
  trim(targetBytes: number): void {
    if (this._totalBytes <= targetBytes) return;

    const allEntries: Array<{
      compId: string;
      frame: number;
      lastAccessed: number;
      byteSize: number;
    }> = [];

    for (const [compId, compCache] of this._cache) {
      for (const [frame, entry] of compCache) {
        allEntries.push({
          compId,
          frame,
          lastAccessed: entry.lastAccessed,
          byteSize: entry.byteSize,
        });
      }
    }

    allEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    for (const e of allEntries) {
      if (this._totalBytes <= targetBytes) break;
      const compCache = this._cache.get(e.compId);
      if (!compCache) continue;
      const entry = compCache.get(e.frame);
      if (entry) {
        this._totalBytes -= entry.byteSize;
        try { entry.imageBitmap.close(); } catch {}
        compCache.delete(e.frame);
      }
    }

    for (const [compId, compCache] of this._cache) {
      if (compCache.size === 0) this._cache.delete(compId);
    }
  }

  clear(): void {
    for (const [, compCache] of this._cache) {
      for (const [, entry] of compCache) {
        try { entry.imageBitmap.close(); } catch {}
      }
    }
    this._cache.clear();
    this._totalBytes = 0;
  }

  get size(): number {
    let count = 0;
    for (const [, compCache] of this._cache) count += compCache.size;
    return count;
  }

  dispose(): void { this.clear(); }
}