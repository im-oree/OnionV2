/**
 * CutoutRuntime — manages background-removal at render time.
 *
 * For each layer with cutout enabled:
 *   - On idle/paused: run the chosen model on the current frame
 *   - Cache the resulting mask keyed by (layerId, frame)
 *   - Return the cached mask to the compositor to composite into alpha
 *
 * During playback, if the baked alpha exists (from 12C's offline bake) we
 * use it. Otherwise we fall back to realtime evaluation, which may drop
 * some frames — expected until the user bakes.
 */
import type { CutoutData } from '../../types/layer';
import { getSegmentationModel, type CutoutModelId } from './segmentationModels';

interface CachedMask {
  frame: number;
  width: number;
  height: number;
  data: Uint8Array;      // grayscale mask
  timestamp: number;
}

/** Per-layer LRU cache of masks */
class LayerMaskCache {
  private _cache = new Map<number, CachedMask>();
  private readonly _maxEntries: number;

  constructor(maxEntries = 60) {
    this._maxEntries = maxEntries;
  }

  get(frame: number): CachedMask | null {
    const entry = this._cache.get(frame);
    if (entry) {
      // Move to end (LRU)
      this._cache.delete(frame);
      this._cache.set(frame, entry);
      return entry;
    }
    return null;
  }

  set(frame: number, mask: CachedMask): void {
    if (this._cache.size >= this._maxEntries) {
      const first = this._cache.keys().next().value;
      if (first !== undefined) this._cache.delete(first);
    }
    this._cache.set(frame, mask);
  }

  clear(): void { this._cache.clear(); }

  has(frame: number): boolean { return this._cache.has(frame); }
}

export class CutoutRuntime {
  private _caches = new Map<string, LayerMaskCache>();
  private _pending = new Map<string, Promise<Uint8Array | null>>();

  /**
   * Evaluate the cutout mask for a layer at a specific frame.
   * Returns null if not ready yet (model still loading, or async in flight).
   * Compositor can retry on next tick.
   */
  async evaluate(
    layerId: string,
    frame: number,
    cutout: CutoutData,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null,
    width: number,
    height: number,
  ): Promise<Uint8Array | null> {
    if (!cutout.enabled || !source) return null;
    if (cutout.model === 'none') return null;

    const cache = this._getCache(layerId);
    const cached = cache.get(frame);
    if (cached && cached.width === width && cached.height === height) {
      return cached.data;
    }

    // Deduplicate in-flight requests for same (layer, frame)
    const key = `${layerId}::${frame}`;
    const existing = this._pending.get(key);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const model = await getSegmentationModel(cutout.model as CutoutModelId);
        const mask = await model.segment(source, width, height);
        cache.set(frame, {
          frame, width, height, data: mask, timestamp: performance.now(),
        });
        return mask;
      } catch (err) {
        console.warn(`[CutoutRuntime] segment failed for ${layerId} frame ${frame}:`, err);
        return null;
      } finally {
        this._pending.delete(key);
      }
    })();

    this._pending.set(key, promise);
    return await promise;
  }

  /** Invalidate cached masks for a layer (e.g., after model change) */
  invalidateLayer(layerId: string): void {
    this._caches.get(layerId)?.clear();
  }

  /** Nuke all caches (e.g., on project close) */
  clearAll(): void {
    for (const c of this._caches.values()) c.clear();
    this._caches.clear();
    this._pending.clear();
  }

  private _getCache(layerId: string): LayerMaskCache {
    let c = this._caches.get(layerId);
    if (!c) {
      c = new LayerMaskCache(60);
      this._caches.set(layerId, c);
    }
    return c;
  }
}

/** App-wide singleton */
export const cutoutRuntime = new CutoutRuntime();