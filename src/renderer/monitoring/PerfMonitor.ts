/**
 * PerfMonitor — continuous performance stats collection.
 *
 * Collects rolling averages for FPS, frame render time, cache hit rate,
 * memory usage, dropped frames, and worker queue depth.
 * Exposes stats for display in Viewport HUD.
 */
import { FrameCache } from '../cache/FrameCache';

export interface PerfStats {
  /** Rolling average FPS over last 60 frames */
  fps: number;
  /** Target FPS (from composition) */
  targetFps: number;
  /** Rolling average frame render time in ms */
  frameTimeMs: number;
  /** Minimum frame time in current window */
  frameTimeMin: number;
  /** Maximum frame time in current window */
  frameTimeMax: number;
  /** Number of dropped frames since last reset */
  droppedFrames: number;
  /** Cache hit rate (0-1) during playback */
  cacheHitRate: number;
  /** RAM cache memory usage in bytes */
  cacheMemoryBytes: number;
  /** Total cache budget in bytes */
  cacheBudgetBytes: number;
  /** Render quality */
  quality: string;
  /** Quality scale factor (1, 0.5, 0.25) */
  qualityScale: number;
}

export class PerfMonitor {
  private _frameTimes: number[] = [];
  private _maxSamples = 60;
  private _fps = 0;
  private _droppedFrames = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _targetFps = 30;
  private _quality = 'full';
  private _qualityScale = 1;
  private _frameCache: FrameCache | null = null;
  private _cacheBudgetBytes = 2 * 1024 * 1024 * 1024;

  /** Set the frame cache to query memory usage */
  setFrameCache(fc: FrameCache): void {
    this._frameCache = fc;
  }

  setTargetFps(fps: number): void {
    this._targetFps = fps;
  }

  setQuality(quality: string, scale: number): void {
    this._quality = quality;
    this._qualityScale = scale;
  }

  setCacheBudget(bytes: number): void {
    this._cacheBudgetBytes = bytes;
  }

  /** Record a frame's render time */
  recordFrameTime(ms: number): void {
    this._frameTimes.push(ms);
    if (this._frameTimes.length > this._maxSamples) {
      this._frameTimes.shift();
    }

    // Update rolling FPS
    if (this._frameTimes.length >= 2) {
      const total = this._frameTimes.reduce((a, b) => a + b, 0);
      const avg = total / this._frameTimes.length;
      this._fps = avg > 0 ? Math.round(1000 / avg) : 0;
    }
  }

  /** Mark a dropped frame */
  recordDroppedFrame(): void {
    this._droppedFrames++;
  }

  /** Record a cache access */
  recordCacheAccess(hit: boolean): void {
    if (hit) this._cacheHits++;
    else this._cacheMisses++;
  }

  /** Reset all counters */
  reset(): void {
    this._frameTimes = [];
    this._droppedFrames = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
  }

  /** Get current stats snapshot */
  getStats(): PerfStats {
    const avg = this._frameTimes.length > 0
      ? this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length
      : 0;
    const min = this._frameTimes.length > 0 ? Math.min(...this._frameTimes) : 0;
    const max = this._frameTimes.length > 0 ? Math.max(...this._frameTimes) : 0;
    const totalCache = this._cacheHits + this._cacheMisses;
    const hitRate = totalCache > 0 ? this._cacheHits / totalCache : 0;
    const memBytes = this._frameCache?.getMemoryUsage() ?? 0;

    return {
      fps: this._fps,
      targetFps: this._targetFps,
      frameTimeMs: Math.round(avg * 10) / 10,
      frameTimeMin: Math.round(min * 10) / 10,
      frameTimeMax: Math.round(max * 10) / 10,
      droppedFrames: this._droppedFrames,
      cacheHitRate: Math.round(hitRate * 100) / 100,
      cacheMemoryBytes: memBytes,
      cacheBudgetBytes: this._cacheBudgetBytes,
      quality: this._quality,
      qualityScale: this._qualityScale,
    };
  }

  dispose(): void {
    this._frameTimes = [];
    this._frameCache = null;
  }
}
