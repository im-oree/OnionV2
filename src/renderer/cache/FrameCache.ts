// FrameCache — unified orchestrator (RAM → Disk → Render)
// Coordinates the three-tier cache: queries RamCache first, falls through to DiskCache,
// and finally triggers render on miss. Manages invalidation, budget, and
// explicit "Bake Preview" capture sessions.
/**
 * FrameCache — AE-style two-tier frame cache.
 *
 * Tier 1: RAM  (RamCache)  — ImageData in JS heap, ~0ms access
 * Tier 2: Disk (DiskCache) — OPFS or IndexedDB, ~2–20ms access
 *
 * Usage:
 *   const result = await frameCache.get(hash);
 *   if (!result) { ... render ... frameCache.set(hash, imageData, compId, frame); }
 *
 * Cache invalidation:
 *   frameCache.invalidateComp(compId)            — all frames for a comp
 *   frameCache.invalidateRange(compId, s, e)     — frame range
 *   frameCache.purge('ram' | 'disk' | 'all')     — manual purge
 */
import { RamCache } from './RamCache';
import { DiskCache } from './DiskCache';
import { hashFrameAtTime } from './CacheHasher';
import type { Composition } from '../../types/composition';

export { hashFrameAtTime } from './CacheHasher';

export class FrameCache {
  readonly ram: RamCache;
  readonly disk: DiskCache;

  private _enabled = true;
  private _diskEnabled = true;
  /** Tracks ongoing disk writes so we don't double-write */
  private _pendingDiskWrites = new Set<string>();

  /** Reusable overlay canvas for blitting cached frames without touching WebGL context */
  private static _overlayCanvas: HTMLCanvasElement | null = null;

  constructor(ramMaxBytes?: number, diskMaxBytes?: number) {
    this.ram = new RamCache(ramMaxBytes);
    this.disk = new DiskCache(diskMaxBytes);
  }

  // ── Config ──────────────────────────────────────────────────

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  get diskEnabled(): boolean { return this._diskEnabled; }
  set diskEnabled(v: boolean) { this._diskEnabled = v; }

  // ── Hash ────────────────────────────────────────────────────

  /** Convenience: hash a frame from a full Composition object */
  hashFor(comp: Composition, frame: number, qualifier?: string): string {
    return hashFrameAtTime(comp, frame, qualifier);
  }

  // ── Get ─────────────────────────────────────────────────────

  /**
   * Try RAM first, then disk.
   * On disk hit, promotes entry to RAM automatically.
   * Returns null on full miss — caller must render and call set().
   */
  async get(hash: string): Promise<ImageData | null> {
    if (!this._enabled) return null;

    // Tier 1: RAM
    const ramHit = this.ram.get(hash);
    if (ramHit) return ramHit.data;

    // Tier 2: Disk
    if (!this._diskEnabled) return null;
    const diskHit = await this.disk.get(hash);
    if (diskHit) {
      // Promote to RAM (non-blocking)
      // We don't know compId/frame here, use placeholder — entry still useful
      this.ram.set(hash, diskHit, '__promoted__', -1);
      return diskHit;
    }

    return null;
  }

  /**
   * Store a rendered frame in both RAM and Disk (disk write is async/non-blocking).
   */
  set(
    hash: string,
    data: ImageData,
    compId: string,
    frame: number,
  ): void {
    if (!this._enabled) return;

    // Write to RAM immediately (synchronous)
    this.ram.set(hash, data, compId, frame);

    // Write to Disk asynchronously — don't block the render loop
    if (this._diskEnabled && !this._pendingDiskWrites.has(hash)) {
      this._pendingDiskWrites.add(hash);
      this.disk.set(hash, data, compId, frame)
        .catch(err => console.warn('[FrameCache] Disk write error:', err))
        .finally(() => this._pendingDiskWrites.delete(hash));
    }
  }

  // ── Invalidation ─────────────────────────────────────────────

  async invalidateComp(compId: string): Promise<void> {
    this.ram.invalidateComp(compId);
    if (this._diskEnabled) {
      await this.disk.invalidateComp(compId).catch(() => {});
    }
  }

  invalidateRange(compId: string, startFrame: number, endFrame: number): void {
    this.ram.invalidateRange(compId, startFrame, endFrame);
    // Disk range invalidation is expensive — skip for now,
    // disk eviction handles stale entries on capacity pressure.
  }

  // ── Range queries ───────────────────────────────────────────

  /**
   * Check if every frame in [startFrame, endFrame) is present in RAM cache.
   * Used by PlaybackControls to decide if cache-only playback is possible.
   */
  isRangeCached(comp: Composition, startFrame: number, endFrame: number): boolean {
    if (!this._enabled) return false;
    for (let f = startFrame; f < endFrame; f++) {
      const hash = this.hashFor(comp, f);
      if (!this.ram.has(hash)) return false;
    }
    return true;
  }

  /**
   * Count how many frames in [startFrame, endFrame) are in RAM cache.
   * Returns { cached, total }.
   */
  cachedFrameCount(
    comp: Composition,
    startFrame: number,
    endFrame: number,
  ): { cached: number; total: number } {
    const total = endFrame - startFrame;
    if (total <= 0) return { cached: 0, total: 0 };
    let cached = 0;
    for (let f = startFrame; f < endFrame; f++) {
      if (this.ram.has(this.hashFor(comp, f))) cached++;
    }
    return { cached, total };
  }

  /**
   * Get the ImageData for a specific frame directly from RAM cache.
   * Returns null if not cached. Does NOT promote from disk (synchronous).
   */
  getFrameSync(comp: Composition, frame: number): ImageData | null {
    const hash = this.hashFor(comp, frame);
    const entry = this.ram.get(hash);
    return entry?.data ?? null;
  }

  async purge(tier: 'ram' | 'disk' | 'all'): Promise<void> {
    if (tier === 'ram' || tier === 'all') {
      this.ram.clear();
    }
    if ((tier === 'disk' || tier === 'all') && this._diskEnabled) {
      await this.disk.purgeAll().catch(() => {});
    }
  }

  // ── Stats ────────────────────────────────────────────────────

  getStats() {
    return {
      ram: this.ram.getStats(),
      disk: this.disk.getStats(),
      pendingDiskWrites: this._pendingDiskWrites.size,
    };
  }

  dispose(): void {
    this.ram.dispose();
    this.disk.dispose();
    FrameCache._overlayCanvas?.remove();
    FrameCache._overlayCanvas = null;
  }

  // ── Renderer integration ─────────────────────────────────────

  /**
   * Read the current WebGL framebuffer into an ImageData and store it.
   * Call this AFTER renderer.render() completes.
   * Returns the hash that was stored, or null if skipped.
   */
  captureFromRenderer(
    glRenderer: import('three').WebGLRenderer,
    hash: string,
    compId: string,
    frame: number,
  ): string | null {
    if (!this._enabled) return null;

    // Don't re-capture if already in RAM cache
    if (this.ram.has(hash)) return hash;

    const canvas = glRenderer.domElement;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return null;

    try {
      const gl = glRenderer.getContext() as WebGL2RenderingContext;
      // Bind default framebuffer (what the user sees)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // WebGL is bottom-up — flip Y into a top-down ImageData
      const imageData = new ImageData(w, h);
      const rowBytes = w * 4;
      for (let y = 0; y < h; y++) {
        const src = y * rowBytes;
        const dst = (h - 1 - y) * rowBytes;
        imageData.data.set(pixels.subarray(src, src + rowBytes), dst);
      }

      this.set(hash, imageData, compId, frame);
      return hash;
    } catch (err) {
      console.warn('[FrameCache] captureFromRenderer error:', err);
      return null;
    }
  }

  /**
   * Blit a cached ImageData back onto the WebGL canvas using a 2D overlay.
   * Overlay uses CSS pixel dimensions matching the WebGL canvas so it
   * lines up exactly regardless of devicePixelRatio.
   */
  blitToCanvas(
    imageData: ImageData,
    targetCanvas: HTMLCanvasElement,
  ): void {
    if (!FrameCache._overlayCanvas) {
      FrameCache._overlayCanvas = document.createElement('canvas');
      FrameCache._overlayCanvas.style.cssText =
        'position:absolute;top:0;left:0;pointer-events:none;display:block;';
    }

    const overlay = FrameCache._overlayCanvas;
    const targetRect = targetCanvas.getBoundingClientRect();

    // Parent to target's parent (viewport container)
    if (overlay.parentElement !== targetCanvas.parentElement) {
      targetCanvas.parentElement?.appendChild(overlay);
    }

    // Match the ImageData pixel size (what we actually have to draw)
    if (overlay.width !== imageData.width || overlay.height !== imageData.height) {
      overlay.width  = imageData.width;
      overlay.height = imageData.height;
    }

    // Size in CSS pixels to match the WebGL canvas visual size exactly
    overlay.style.width  = `${targetRect.width}px`;
    overlay.style.height = `${targetRect.height}px`;
    overlay.style.display = 'block';
    overlay.style.visibility = 'visible';

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Hide the overlay canvas completely so the underlying WebGL canvas is
   * visible. Sets display:none rather than just clearing pixels, so an
   * old blitted frame never shows through when we've moved to normal render.
   */
  hideOverlay(): void {
    if (FrameCache._overlayCanvas) {
      FrameCache._overlayCanvas.style.display = 'none';
      const ctx = FrameCache._overlayCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(
          0, 0,
          FrameCache._overlayCanvas.width,
          FrameCache._overlayCanvas.height,
        );
      }
    }
  }
}

/** Singleton instance — shared across the app */
export const frameCache = new FrameCache();