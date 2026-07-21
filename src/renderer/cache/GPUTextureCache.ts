/**
 * GPUTextureCache — stores rendered frames as THREE.Texture objects
 * so they can be displayed WITHOUT any CPU-side readPixels -> canvas ->
 * ImageBitmap -> CanvasTexture round-trip.
 *
 * Features:
 * - Configurable GPU memory budget (default 512 MB)
 * - LRU eviction with priority scoring based on layer visibility
 *   and proximity to the current playhead position
 * - Auto-eviction when budget is exceeded (evicts lowest-priority,
 *   oldest-accessed entries first)
 *
 * Textures are created via copyFramebufferToTexture right after each
 * cache-build render while the framebuffer still has the content.
 *
 * When _displayCachedFrame runs, it checks this cache FIRST.  On a hit
 * it swaps the quad material's map to the GPU texture directly —
 * zero CPU work, exactly one glCopyTexSubImage2D per frame ever.
 */
import * as THREE from 'three';
import type { Composition } from '../../types/composition';

/** Internal tracking entry for a cached GPU texture. */
interface GPUCacheEntry {
  texture: THREE.Texture;
  byteSize: number;
  lastAccessed: number;
  /** Priority score 0–1, higher = more important to keep. Derived from
   *  layer visibility and distance from playhead. Recalculated periodically
   *  via updatePriorities(). */
  priority: number;
  compId: string;
  frame: number;
}

export class GPUTextureCache {
  /** compId → (frameNumber → entry) */
  private _cache = new Map<string, Map<number, GPUCacheEntry>>();

  /** Maximum GPU memory to use (bytes). Default 512 MB. */
  private _maxBytes: number;

  /** Currently used GPU memory (bytes). */
  private _usedBytes = 0;

  /** Throttle eviction to once per N captures to avoid perf churn. */
  private _evictionThrottleCounter = 0;
  private static readonly EVICTION_INTERVAL = 4;

  /** Default budget from hardware profile or user pref. */
  static defaultMaxBytes(): number {
    const deviceMem = (navigator as any).deviceMemory;
    // ~25% of system RAM as a rough GPU budget ceiling, capping at 4 GB
    const systemGuess = deviceMem
      ? deviceMem * 1024 * 1024 * 1024 * 0.25
      : 2 * 1024 * 1024 * 1024;
    return Math.min(4 * 1024 * 1024 * 1024, systemGuess);
  }

  constructor(maxBytes?: number) {
    this._maxBytes = maxBytes ?? GPUTextureCache.defaultMaxBytes();
  }

  // ── Budget API ─────────────────────────────────────────────────

  get maxBytes(): number { return this._maxBytes; }
  get usedBytes(): number { return this._usedBytes; }
  get availableBytes(): number { return Math.max(0, this._maxBytes - this._usedBytes); }

  /** Change the budget. If new budget is smaller than current usage,
   *  triggers eviction immediately. */
  setMaxBytes(bytes: number): void {
    const clamped = Math.max(64 * 1024 * 1024, bytes); // floor 64 MB
    this._maxBytes = clamped;
    if (this._usedBytes > this._maxBytes) {
      this.evict();
    }
  }

  // ── Capture / Store ────────────────────────────────────────────

  /**
   * Copy the default framebuffer into a new texture and store it.
   * The framebuffer must still contain the frame we just rendered.
   */
  capture(renderer: THREE.WebGLRenderer, w: number, h: number, compId: string, frame: number): void {
    // Dispose any existing texture for this slot
    this.delete(compId, frame);

    const byteSize = w * h * 4; // RGBA8

    // Create a DataTexture with uninitialised data.  This triggers
    // the WebGL texture allocation (texImage2D) so the texture has a
    // valid gl object that copyFramebufferToTexture can target.
    const buf = new Uint8Array(w * h * 4);
    const tex = new THREE.DataTexture(buf, w, h, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    // No mipmaps — cached frames are displayed 1:1
    tex.generateMipmaps = false;

    // CRITICAL: keep the default SRGBColorSpace.
    // copyFramebufferToTexture → gl.copyTexSubImage2D stores the
    // framebuffer's sRGB-encoded bytes.  The hardware sRGB→linear
    // decode on sampling correctly undoes any intermediate encoding,
    // and the renderer's outputColorSpace applies the final sRGB
    // encode for display.
    tex.colorSpace = THREE.SRGBColorSpace;

    // Allocate the WebGL texture object in Three.js's internal bookkeeping
    tex.needsUpdate = true;

    // Copy the current (default) framebuffer content into the texture
    renderer.copyFramebufferToTexture(tex, new THREE.Vector2(0, 0));

    // Store in cache with tracking entry
    let compCache = this._cache.get(compId);
    if (!compCache) {
      compCache = new Map();
      this._cache.set(compId, compCache);
    }

    const entry: GPUCacheEntry = {
      texture: tex,
      byteSize,
      lastAccessed: Date.now(),
      priority: 0.5, // default mid — will be refined by updatePriorities()
      compId,
      frame,
    };
    compCache.set(frame, entry);
    this._usedBytes += byteSize;

    // Throttled eviction check
    this._evictionThrottleCounter = (this._evictionThrottleCounter + 1) % GPUTextureCache.EVICTION_INTERVAL;
    if (this._evictionThrottleCounter === 0 && this._usedBytes > this._maxBytes) {
      this.evict();
    }
  }

  /** Retrieve a cached GPU texture, or null if not present. Also
   *  updates the LRU timestamp. */
  get(compId: string, frame: number): THREE.Texture | null {
    const entry = this._cache.get(compId)?.get(frame);
    if (!entry) return null;
    entry.lastAccessed = Date.now();
    // Bump priority slightly on access so frequently-seen frames survive longer
    entry.priority = Math.min(1, entry.priority + 0.05);
    return entry.texture;
  }

  /** Read an entry without updating LRU timestamp (for inspection). */
  peek(compId: string, frame: number): THREE.Texture | null {
    return this._cache.get(compId)?.get(frame)?.texture ?? null;
  }

  delete(compId: string, frame: number): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;
    const entry = compCache.get(frame);
    if (entry) {
      entry.texture.dispose();
      this._usedBytes -= entry.byteSize;
      compCache.delete(frame);
    }
  }

  invalidateAll(compId: string): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;
    for (const entry of compCache.values()) {
      this._usedBytes -= entry.byteSize;
      entry.texture.dispose();
    }
    compCache.clear();
  }

  invalidateAllCompositions(): void {
    for (const [id] of this._cache) this.invalidateAll(id);
  }

  clear(): void {
    for (const [, compCache] of this._cache) {
      for (const entry of compCache.values()) {
        this._usedBytes -= entry.byteSize;
        entry.texture.dispose();
      }
    }
    this._cache.clear();
    this._usedBytes = 0;
  }

  // ── Priority Scoring ────────────────────────────────────────────

  /**
   * Recalculate priority scores for all cached entries based on the
   * current composition state. Call this periodically (e.g. once per
   * rendered frame) to keep eviction ordering fresh.
   *
   * Priority factors:
   * - Frame distance from the active comp's playhead (closer = higher)
   * - Whether the frame is in a visible, un-soloed layer range
   *
   * Pass the active composition and a map of compId → currentTime
   * so nested compositions also get correct scores.
   */
  updatePriorities(compositions: Composition[], currentTimeMap: Map<string, number>): void {
    // Build a fast lookup: layer start/end ranges keyed by compId
    const compLayerRanges = new Map<string, Array<{ start: number; end: number }>>();
    for (const comp of compositions) {
      const ranges: Array<{ start: number; end: number }> = [];
      for (const layer of comp.layers) {
        if (!layer.visible || layer.shy) continue;
        ranges.push({ start: layer.startFrame, end: layer.endFrame });
      }
      compLayerRanges.set(comp.id, ranges);
    }

    for (const [, compCache] of this._cache) {
      for (const entry of compCache.values()) {
        let score = 0.5; // baseline

        // Factor 1: playhead proximity
        const currentTime = currentTimeMap.get(entry.compId);
        if (currentTime !== undefined) {
          const comp = compositions.find((c) => c.id === entry.compId);
          if (comp) {
            const currentFrame = Math.floor(currentTime * comp.fps);
            const dist = Math.abs(entry.frame - currentFrame);
            // Exponential falloff: frames within 1 sec get high score
            const radius = comp.fps; // 1 second radius
            score += 0.4 * Math.exp(-(dist * dist) / (2 * radius * radius));
          }
        }

        // Factor 2: layer visibility — frames inside visible layer ranges
        // get a bonus
        const ranges = compLayerRanges.get(entry.compId);
        if (ranges && ranges.length > 0) {
          const inAnyRange = ranges.some(
            (r) => entry.frame >= r.start && entry.frame <= r.end,
          );
          if (inAnyRange) score += 0.1;
        }

        // Clamp
        entry.priority = Math.max(0, Math.min(1, score));
      }
    }
  }

  // ── Eviction ────────────────────────────────────────────────────

  /**
   * Evict entries until total usage ≤ targetBytes (defaults to 90% of max).
   * Eviction order: lowest priority first, then oldest-accessed within the
   * same priority tier.
   *
   * @returns number of entries evicted.
   */
  evict(targetBytes?: number): number {
    const target = targetBytes ?? Math.floor(this._maxBytes * 0.9);
    if (this._usedBytes <= target) return 0;

    // Flatten all entries
    const all: GPUCacheEntry[] = [];
    for (const [, compCache] of this._cache) {
      for (const entry of compCache.values()) {
        all.push(entry);
      }
    }

    // Sort: lowest priority first, then oldest-accessed
    all.sort((a, b) => {
      const prioDiff = a.priority - b.priority;
      if (Math.abs(prioDiff) > 0.01) return prioDiff;
      return a.lastAccessed - b.lastAccessed;
    });

    let evicted = 0;
    for (const entry of all) {
      if (this._usedBytes <= target) break;
      const compCache = this._cache.get(entry.compId);
      if (!compCache) continue;
      const stored = compCache.get(entry.frame);
      if (stored && stored.texture === entry.texture) {
        this._usedBytes -= entry.byteSize;
        entry.texture.dispose();
        compCache.delete(entry.frame);
        evicted++;
      }
    }

    // Clean up empty composition maps
    for (const [compId, compCache] of this._cache) {
      if (compCache.size === 0) this._cache.delete(compId);
    }

    return evicted;
  }

  // ── Stats ───────────────────────────────────────────────────────

  /** Number of GPU textures currently cached */
  get size(): number {
    let count = 0;
    for (const [, compCache] of this._cache) count += compCache.size;
    return count;
  }

  /** Number of compositions with any cached GPU textures */
  get compCount(): number { return this._cache.size; }

  /** Current memory usage as fraction of budget (0–1) */
  get usageFraction(): number {
    return this._maxBytes > 0 ? this._usedBytes / this._maxBytes : 0;
  }

  /** Per-composition breakdown for the performance panel. */
  getCompositionBreakdown(): Array<{ compId: string; frames: number; bytes: number }> {
    const result: Array<{ compId: string; frames: number; bytes: number }> = [];
    for (const [compId, compCache] of this._cache) {
      let frames = 0;
      let bytes = 0;
      for (const entry of compCache.values()) {
        frames++;
        bytes += entry.byteSize;
      }
      result.push({ compId, frames, bytes });
    }
    return result.sort((a, b) => b.bytes - a.bytes);
  }

  dispose(): void { this.clear(); }
}
