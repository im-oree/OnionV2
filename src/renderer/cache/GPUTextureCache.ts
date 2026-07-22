/**
 * GPUTextureCache — stores rendered frames as THREE.Texture objects.
 * LRU + priority-based eviction with configurable GPU memory budget.
 */
import * as THREE from 'three';
import type { Composition } from '../../types/composition';

interface GPUCacheEntry {
  texture: THREE.Texture;
  byteSize: number;
  lastAccessed: number;
  priority: number;
  compId: string;
  frame: number;
}

export class GPUTextureCache {
  private _cache = new Map<string, Map<number, GPUCacheEntry>>();
  private _maxBytes: number;
  private _usedBytes = 0;
  private _evictionThrottleCounter = 0;
  private static readonly EVICTION_INTERVAL = 4;

  static defaultMaxBytes(): number {
    const deviceMem = (navigator as any)?.deviceMemory;
    const systemGuess = deviceMem
      ? deviceMem * 1024 * 1024 * 1024 * 0.25
      : 2 * 1024 * 1024 * 1024;
    return Math.min(4 * 1024 * 1024 * 1024, systemGuess);
  }

  constructor(maxBytes?: number) {
    this._maxBytes = Math.max(
      64 * 1024 * 1024,
      maxBytes ?? GPUTextureCache.defaultMaxBytes(),
    );
  }

  // ── Budget API ─────────────────────────────────────────────────

  get maxBytes(): number { return this._maxBytes; }
  get usedBytes(): number { return this._usedBytes; }
  get availableBytes(): number {
    return Math.max(0, this._maxBytes - this._usedBytes);
  }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(64 * 1024 * 1024, bytes);
    if (this._usedBytes > this._maxBytes) {
      this.evict();
    }
  }

  // ── Capture / Store ────────────────────────────────────────────

  capture(
    renderer: THREE.WebGLRenderer,
    w: number,
    h: number,
    compId: string,
    frame: number,
  ): void {
    if (!compId || !Number.isFinite(frame) || w <= 0 || h <= 0) return;

    this.delete(compId, frame);

    const byteSize = Math.max(0, w * h * 4);

    // Allocate texture without large CPU-side buffer
    const tex = new THREE.Texture();
    tex.image = { width: w, height: h };
    tex.format = THREE.RGBAFormat;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    renderer.copyFramebufferToTexture(
      tex,
      new THREE.Vector2(0, 0),
    );

    let compCache = this._cache.get(compId);
    if (!compCache) {
      compCache = new Map();
      this._cache.set(compId, compCache);
    }

    compCache.set(frame, {
      texture: tex,
      byteSize,
      lastAccessed: performance.now(),
      priority: 0.5,
      compId,
      frame,
    });

    this._usedBytes += byteSize;

    this._evictionThrottleCounter =
      (this._evictionThrottleCounter + 1) %
      GPUTextureCache.EVICTION_INTERVAL;

    if (
      this._evictionThrottleCounter === 0 &&
      this._usedBytes > this._maxBytes
    ) {
      this.evict();
    }
  }

  get(compId: string, frame: number): THREE.Texture | null {
    const entry = this._cache.get(compId)?.get(frame);
    if (!entry) return null;

    entry.lastAccessed = performance.now();
    entry.priority = Math.min(1, entry.priority + 0.05);

    return entry.texture;
  }

  peek(compId: string, frame: number): THREE.Texture | null {
    return this._cache.get(compId)?.get(frame)?.texture ?? null;
  }

  delete(compId: string, frame: number): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;

    const entry = compCache.get(frame);
    if (!entry) return;

    entry.texture.dispose();
    this._usedBytes = Math.max(0, this._usedBytes - entry.byteSize);
    compCache.delete(frame);

    if (compCache.size === 0) {
      this._cache.delete(compId);
    }
  }

  invalidateAll(compId: string): void {
    const compCache = this._cache.get(compId);
    if (!compCache) return;

    for (const entry of compCache.values()) {
      this._usedBytes = Math.max(0, this._usedBytes - entry.byteSize);
      entry.texture.dispose();
    }

    compCache.clear();
    this._cache.delete(compId);
  }

  invalidateAllCompositions(): void {
    for (const id of Array.from(this._cache.keys())) {
      this.invalidateAll(id);
    }
  }

  clear(): void {
    for (const compCache of this._cache.values()) {
      for (const entry of compCache.values()) {
        entry.texture.dispose();
      }
    }
    this._cache.clear();
    this._usedBytes = 0;
  }

  // ── Priority Scoring ────────────────────────────────────────────

  updatePriorities(
    compositions: Composition[],
    currentTimeMap: Map<string, number>,
  ): void {
    const compLookup = new Map(
      compositions.map((c) => [c.id, c]),
    );

    const compLayerRanges = new Map<
      string,
      Array<{ start: number; end: number }>
    >();

    for (const comp of compositions) {
      const ranges: Array<{ start: number; end: number }> = [];

      for (const layer of comp.layers) {
        if (!layer.visible || layer.shy) continue;
        ranges.push({
          start: layer.startFrame,
          end: layer.endFrame,
        });
      }

      compLayerRanges.set(comp.id, ranges);
    }

    for (const compCache of this._cache.values()) {
      for (const entry of compCache.values()) {
        let score = 0.5;

        const comp = compLookup.get(entry.compId);
        const currentTime = currentTimeMap.get(entry.compId);

        if (comp && currentTime !== undefined) {
          const currentFrame = Math.floor(
            currentTime * comp.fps,
          );
          const dist = Math.abs(entry.frame - currentFrame);
          const radius = Math.max(1, comp.fps);

          score +=
            0.4 *
            Math.exp(
              -(dist * dist) / (2 * radius * radius),
            );
        }

        const ranges = compLayerRanges.get(entry.compId);
        if (ranges?.some(
          (r) =>
            entry.frame >= r.start &&
            entry.frame <= r.end,
        )) {
          score += 0.1;
        }

        entry.priority = Math.max(0, Math.min(1, score));
      }
    }
  }

  // ── Eviction ────────────────────────────────────────────────────

  evict(targetBytes?: number): number {
    const target =
      targetBytes ??
      Math.floor(this._maxBytes * 0.9);

    if (this._usedBytes <= target) return 0;

    const all: GPUCacheEntry[] = [];

    for (const compCache of this._cache.values()) {
      for (const entry of compCache.values()) {
        all.push(entry);
      }
    }

    all.sort((a, b) => {
      const prioDiff = a.priority - b.priority;
      if (Math.abs(prioDiff) > 0.01) return prioDiff;
      return a.lastAccessed - b.lastAccessed;
    });

    let evicted = 0;

    for (const entry of all) {
      if (this._usedBytes <= target) break;

      const compCache = this._cache.get(entry.compId);
      const stored = compCache?.get(entry.frame);
      if (!stored || stored.texture !== entry.texture) continue;

      stored.texture.dispose();
      this._usedBytes = Math.max(
        0,
        this._usedBytes - stored.byteSize,
      );
      compCache.delete(entry.frame);
      evicted++;

      if (compCache.size === 0) {
        this._cache.delete(entry.compId);
      }
    }

    return evicted;
  }

  // ── Stats ───────────────────────────────────────────────────────

  get size(): number {
    let count = 0;
    for (const compCache of this._cache.values()) {
      count += compCache.size;
    }
    return count;
  }

  get compCount(): number {
    return this._cache.size;
  }

  get usageFraction(): number {
    return this._maxBytes > 0
      ? this._usedBytes / this._maxBytes
      : 0;
  }

  getCompositionBreakdown(): Array<{
    compId: string;
    frames: number;
    bytes: number;
  }> {
    const result: Array<{
      compId: string;
      frames: number;
      bytes: number;
    }> = [];

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

  dispose(): void {
    this.clear();
  }
}