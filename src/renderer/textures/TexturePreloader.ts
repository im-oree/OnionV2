/**
 * TexturePreloader — preloads image layer textures ahead of the playhead
 * during playback so textures are ready before the playhead reaches them.
 *
 * Licensed under No License (public domain / CC0).
 *
 * Key design:
 * - Only runs during active playback (isPlaying === true)
 * - Looks ahead N frames (configurable, default 30) from the current frame
 * - Identifies image/video layers in the lookahead window whose textures
 *   are not yet cached
 * - Triggers loads via TextureCache.loadImage() so they're ready on arrival
 * - Uses a concurrency limit (default 4) to avoid overwhelming the network
 * - Deduplicates requests — never starts two loads for the same assetId
 */
import { textureCache } from './TextureCache';
import { assetManager } from '../../storage/AssetManager';
import type { Composition } from '../../types/composition';

export class TexturePreloader {
  /** How many frames ahead of the playhead to scan. Default 30 (~1s at 30fps). */
  private _lookAheadFrames = 30;

  /** Maximum concurrent texture loads. Default 4. */
  private _concurrency = 4;

  /** Set of assetIds currently being loaded (for dedup). */
  private _inFlight = new Set<string>();

  /** Queue of assetIds waiting to load (when concurrency is saturated). */
  private _queue: string[] = [];

  /** The last composition ID we scanned — used to skip redundant scans. */
  private _lastCompId = '';

  /** The last frame number we scanned — used to skip when playhead hasn't moved. */
  private _lastFrame = -1;

  /** Whether playback is active (set externally each frame). */
  private _isPlaying = false;

  // ── Configuration ────────────────────────────────────────────

  set lookAheadFrames(frames: number) { this._lookAheadFrames = Math.max(1, frames); }
  get lookAheadFrames(): number { return this._lookAheadFrames; }

  set concurrency(n: number) { this._concurrency = Math.max(1, n); }
  get concurrency(): number { return this._concurrency; }

  // ── Playback state ──────────────────────────────────────────

  /** Call every frame with the current playback state. */
  set isPlaying(v: boolean) { this._isPlaying = v; }

  // ── Main update ─────────────────────────────────────────────

  /**
   * Called each frame during beforeRender. Scans image layers N frames
   * ahead and triggers texture preloads for any uncached assets.
   */
  update(comp: Composition, currentFrame: number): void {
    // Only preload during active playback
    if (!this._isPlaying) {
      // When stopped, clear pending queue to avoid stale loads
      this._queue.length = 0;
      return;
    }

    // Throttle: don't re-scan if we're still on the same frame
    if (comp.id === this._lastCompId && currentFrame === this._lastFrame) {
      // Still pump the queue, but don't re-scan
      this._pumpQueue();
      return;
    }

    this._lastCompId = comp.id;
    this._lastFrame = currentFrame;

    const lookAheadEnd = Math.ceil(currentFrame + this._lookAheadFrames);

    // Collect uncached asset IDs from layers in the lookahead window
    const neededIds = new Set<string>();

    for (const layer of comp.layers) {
      // Skip layers with no assetId (e.g. solids, shapes, text)
      const data = layer.data as Record<string, any> | undefined;
      const assetId = data?.assetId;
      if (!assetId) continue;

      // Skip layers that are outside the lookahead window
      if (layer.startFrame > lookAheadEnd || layer.endFrame < currentFrame) continue;

      // Skip non-image layers (videos have their own streaming system)
      const asset = assetManager.getAsset(assetId);
      if (!asset || asset.type !== 'image') continue;

      // Skip if already cached or already loading
      if (textureCache.has(assetId) || this._inFlight.has(assetId)) continue;

      neededIds.add(assetId);
    }

    // Queue needed assets for loading
    for (const id of neededIds) {
      if (!this._queue.includes(id)) {
        this._queue.push(id);
      }
    }

    // Start loading from the queue
    this._pumpQueue();
  }

  /**
   * Called when a composition changes — resets preloader state so it
   * re-scans on the next frame.
   */
  reset(): void {
    this._lastCompId = '';
    this._lastFrame = -1;
    this._queue.length = 0;
    // Clear in-flight loads: they were for the old composition's assets.
    // The promises will still resolve but the textures won't be tracked
    // by the preloader — they'll be garbage collected when the old
    // TextureCache entries are decRef'd by layer disposal.
    this._inFlight.clear();
  }

  /**
   * Cancel all pending loads and clear state — called on dispose.
   */
  clear(): void {
    this._queue.length = 0;
    this._inFlight.clear();
    this._lastCompId = '';
    this._lastFrame = -1;
  }

  // ── Internals ───────────────────────────────────────────────

  /** Start up to `concurrency` new loads from the queue. */
  private _pumpQueue(): void {
    while (this._inFlight.size < this._concurrency && this._queue.length > 0) {
      const assetId = this._queue.shift()!;
      if (this._inFlight.has(assetId)) continue; // safety: already loading
      this._startLoad(assetId);
    }
  }

  /** Kick off a single texture load and track it. */
  private _startLoad(assetId: string): void {
    const asset = assetManager.getAsset(assetId);
    if (!asset || !asset.url) {
      // Asset missing or no URL — nothing to load. Free the concurrency
      // slot so the queue doesn't stall on a missing asset.
      this._pumpQueue();
      return;
    }

    this._inFlight.add(assetId);

    textureCache.loadImage(assetId, asset.url)
      .then((texture) => {
        texture.needsUpdate = true;
        // Notify the renderer to redraw so the preloaded texture appears
        // immediately if the playhead has already arrived at this frame.
        try {
          const r = (window as any).__renderer;
          r?.renderLoop?.requestRender?.();
        } catch { /* ignore */ }
      })
      .catch((err) => {
        console.warn('[TexturePreloader] Failed to preload', assetId, err);
      })
      .finally(() => {
        this._inFlight.delete(assetId);
        this._pumpQueue(); // start next queued load
      });
  }
}
