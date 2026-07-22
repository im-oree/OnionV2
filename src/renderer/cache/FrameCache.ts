/**
 * FrameCache — simple, reliable per-composition frame cache.
 * Stores rendered frames as ImageBitmaps with LRU eviction.
 */
export type CacheQuality = 'full' | 'half' | 'quarter';

export interface CachedFrame {
  imageBitmap: ImageBitmap;
  byteSize: number;
  lastAccessed: number;
  quality: CacheQuality;
}

const QUALITY_ORDER: CacheQuality[] = ['full', 'half', 'quarter'];

export class FrameCache {
  private _cache = new Map<string, Map<number, CachedFrame>>();
  private _totalBytes = 0;
  private _maxBytes: number;
  private _trimPending = false;

  constructor(maxBytes?: number) {
    this._maxBytes = maxBytes ?? 512 * 1024 * 1024; // 512 MB default
  }

  get maxBytes(): number { return this._maxBytes; }

  get size(): number {
    let n = 0;
    for (const m of this._cache.values()) n += m.size;
    return n;
  }

  getMemoryUsage(): number { return this._totalBytes; }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(32 * 1024 * 1024, bytes);
    if (this._totalBytes > this._maxBytes) this._evict();
  }

  /** Store a frame. Closes any existing bitmap at this slot. */
  store(
    compId: string,
    frame: number,
    imageBitmap: ImageBitmap,
    quality: CacheQuality,
  ): void {
    if (!compId) return;
    if (!Number.isFinite(frame)) return;

    let map = this._cache.get(compId);
    if (!map) {
      map = new Map();
      this._cache.set(compId, map);
    }

    const old = map.get(frame);
    if (old) {
      this._totalBytes -= old.byteSize;
      try { old.imageBitmap.close(); } catch {}
    }

    // More accurate memory estimate (RGBA 4 bytes per pixel)
    const byteSize = Math.max(0, imageBitmap.width * imageBitmap.height * 4);

    map.set(frame, {
      imageBitmap,
      byteSize,
      lastAccessed: performance.now(),
      quality,
    });

    this._totalBytes += byteSize;

    // Lazy eviction — don't block render
    if (this._totalBytes > this._maxBytes && !this._trimPending) {
      this._trimPending = true;
      queueMicrotask(() => {
        this._trimPending = false;
        this._evict();
      });
    }
  }

  /** Get a frame for display. Updates LRU timestamp. */
  get(compId: string, frame: number): CachedFrame | null {
    const entry = this._cache.get(compId)?.get(frame);
    if (!entry) return null;
    entry.lastAccessed = performance.now();
    return entry;
  }

  /** Peek without updating LRU. */
  peek(compId: string, frame: number): CachedFrame | null {
    return this._cache.get(compId)?.get(frame) ?? null;
  }

  /** Check if frame exists with optional minimum quality requirement. */
  has(compId: string, frame: number, minQuality?: CacheQuality): boolean {
    const entry = this._cache.get(compId)?.get(frame);
    if (!entry) return false;
    if (!minQuality) return true;

    const entryIdx = QUALITY_ORDER.indexOf(entry.quality);
    const requiredIdx = QUALITY_ORDER.indexOf(minQuality);

    if (entryIdx === -1 || requiredIdx === -1) return false;

    return entryIdx <= requiredIdx;
  }

  /** Invalidate a range of frames (inclusive). */
  invalidate(compId: string, fromFrame?: number, toFrame?: number): void {
    const map = this._cache.get(compId);
    if (!map) return;

    if (
      fromFrame === undefined ||
      toFrame === undefined ||
      !Number.isFinite(fromFrame) ||
      !Number.isFinite(toFrame)
    ) {
      this.invalidateAll(compId);
      return;
    }

    const start = Math.floor(Math.min(fromFrame, toFrame));
    const end = Math.floor(Math.max(fromFrame, toFrame));

    for (let f = start; f <= end; f++) {
      const e = map.get(f);
      if (!e) continue;

      this._totalBytes -= e.byteSize;
      try { e.imageBitmap.close(); } catch {}
      map.delete(f);
    }

    if (map.size === 0) this._cache.delete(compId);
  }

  /** Invalidate all frames for a composition. */
  invalidateAll(compId: string): void {
    const map = this._cache.get(compId);
    if (!map) return;

    for (const e of map.values()) {
      this._totalBytes -= e.byteSize;
      try { e.imageBitmap.close(); } catch {}
    }

    map.clear();
    this._cache.delete(compId);
  }

  /** Invalidate ALL compositions. */
  invalidateAllCompositions(): void {
    for (const id of Array.from(this._cache.keys())) {
      this.invalidateAll(id);
    }
  }

  /** Get coverage fraction (0-1) in a frame range (inclusive). */
  getCoverage(compId: string, startFrame: number, endFrame: number): number {
    const map = this._cache.get(compId);
    if (!map) return 0;

    if (!Number.isFinite(startFrame) || !Number.isFinite(endFrame)) return 0;

    const start = Math.floor(Math.min(startFrame, endFrame));
    const end = Math.floor(Math.max(startFrame, endFrame));

    if (end < start) return 0;

    let cached = 0;
    for (let f = start; f <= end; f++) {
      if (map.has(f)) cached++;
    }

    const total = end - start + 1;
    return total > 0 ? cached / total : 0;
  }

  /** LRU eviction — remove oldest frames until under 80% budget. */
  private _evict(): void {
    const target = Math.floor(this._maxBytes * 0.8);
    if (this._totalBytes <= target) return;

    const entries: Array<{
      compId: string;
      frame: number;
      lastAccessed: number;
    }> = [];

    for (const [compId, map] of this._cache) {
      for (const [frame, e] of map) {
        entries.push({
          compId,
          frame,
          lastAccessed: e.lastAccessed,
        });
      }
    }

    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    for (const e of entries) {
      if (this._totalBytes <= target) break;

      const map = this._cache.get(e.compId);
      const entry = map?.get(e.frame);
      if (!entry) continue;

      this._totalBytes -= entry.byteSize;
      try { entry.imageBitmap.close(); } catch {}
      map.delete(e.frame);

      if (map.size === 0) {
        this._cache.delete(e.compId);
      }
    }
  }

  /** Clear everything. */
  clear(): void {
    for (const map of this._cache.values()) {
      for (const e of map.values()) {
        try { e.imageBitmap.close(); } catch {}
      }
    }
    this._cache.clear();
    this._totalBytes = 0;
    this._trimPending = false;
  }

  dispose(): void {
    this.clear();
  }
}