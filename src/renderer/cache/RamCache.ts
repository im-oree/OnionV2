/**
 * RamCache — LRU in-memory cache for rendered frames.
 *
 * Stores ImageData (CPU pixels) keyed by frame hash string.
 * LRU implemented via insertion-order Map + size accounting.
 *
 * Thread: main thread only.
 */

export interface RamCacheEntry {
  hash: string;
  data: ImageData;
  byteSize: number;
  lastAccessed: number;
  compId: string;
  frame: number;
}

export class RamCache {
  // Insertion-order Map acts as LRU when we move accessed
  // entries to the end on each get().
  private _map = new Map<string, RamCacheEntry>();
  private _usedBytes = 0;
  private _maxBytes: number;
  private _hits = 0;
  private _misses = 0;

  constructor(maxBytes?: number) {
    this._maxBytes = maxBytes ?? RamCache.defaultMaxBytes();
  }

  // ── Budget ──────────────────────────────────────────────────

  static defaultMaxBytes(): number {
    const mem = (navigator as any).deviceMemory as number | undefined;
    // Use 25% of device RAM, capped at 4 GB, floored at 256 MB
    const guess = mem
      ? mem * 1024 * 1024 * 1024 * 0.25
      : 512 * 1024 * 1024;
    return Math.max(256 * 1024 * 1024, Math.min(4 * 1024 * 1024 * 1024, guess));
  }

  get maxBytes(): number { return this._maxBytes; }
  get usedBytes(): number { return this._usedBytes; }
  get size(): number { return this._map.size; }
  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }
  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(64 * 1024 * 1024, bytes);
    this._evictToTarget(this._maxBytes);
  }

  // ── Core API ────────────────────────────────────────────────

  get(hash: string): RamCacheEntry | null {
    const entry = this._map.get(hash);
    if (!entry) {
      this._misses++;
      return null;
    }
    // Move to end (most recently used)
    this._map.delete(hash);
    entry.lastAccessed = performance.now();
    this._map.set(hash, entry);
    this._hits++;
    return entry;
  }

  has(hash: string): boolean {
    return this._map.has(hash);
  }

  set(
    hash: string,
    data: ImageData,
    compId: string,
    frame: number,
  ): void {
    // Remove existing entry for this hash if re-setting
    if (this._map.has(hash)) {
      this._removeByHash(hash);
    }

    const byteSize = data.width * data.height * 4;

    // If a single frame exceeds the entire budget, skip caching it
    if (byteSize > this._maxBytes) return;

    // Evict until we have room
    this._evictToTarget(this._maxBytes - byteSize);

    const entry: RamCacheEntry = {
      hash,
      data,
      byteSize,
      lastAccessed: performance.now(),
      compId,
      frame,
    };

    this._map.set(hash, entry);
    this._usedBytes += byteSize;
  }

  delete(hash: string): void {
    this._removeByHash(hash);
  }

  /** Remove all cached frames for a specific composition */
  invalidateComp(compId: string): number {
    let removed = 0;
    for (const [hash, entry] of this._map) {
      if (entry.compId === compId) {
        this._usedBytes = Math.max(0, this._usedBytes - entry.byteSize);
        this._map.delete(hash);
        removed++;
      }
    }
    return removed;
  }

  /** Remove frames for a comp within a frame range */
  invalidateRange(compId: string, startFrame: number, endFrame: number): number {
    let removed = 0;
    for (const [hash, entry] of this._map) {
      if (
        entry.compId === compId &&
        entry.frame >= startFrame &&
        entry.frame <= endFrame
      ) {
        this._usedBytes = Math.max(0, this._usedBytes - entry.byteSize);
        this._map.delete(hash);
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this._map.clear();
    this._usedBytes = 0;
  }

  resetStats(): void {
    this._hits = 0;
    this._misses = 0;
  }

  // ── Eviction ────────────────────────────────────────────────

  private _evictToTarget(targetBytes: number): void {
    // Map iterates in insertion order — oldest entries are first
    for (const [hash, entry] of this._map) {
      if (this._usedBytes <= targetBytes) break;
      this._usedBytes = Math.max(0, this._usedBytes - entry.byteSize);
      this._map.delete(hash);
    }
  }

  private _removeByHash(hash: string): void {
    const entry = this._map.get(hash);
    if (!entry) return;
    this._usedBytes = Math.max(0, this._usedBytes - entry.byteSize);
    this._map.delete(hash);
  }

  // ── Stats ───────────────────────────────────────────────────

  getStats(): {
    usedBytes: number;
    maxBytes: number;
    usageFraction: number;
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    return {
      usedBytes: this._usedBytes,
      maxBytes: this._maxBytes,
      usageFraction: this._maxBytes > 0 ? this._usedBytes / this._maxBytes : 0,
      size: this._map.size,
      hitRate: this.hitRate,
      hits: this._hits,
      misses: this._misses,
    };
  }

  /** Iterate all entries for debugging/display */
  entries(): IterableIterator<[string, RamCacheEntry]> {
    return this._map.entries();
  }

  dispose(): void {
    this.clear();
  }
}