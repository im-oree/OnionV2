/**
 * PerfMonitor â€” continuous performance stats collection.
 * O(1) rolling averages; no array spreads.
 */
import { FrameCache } from '../cache/FrameCache';

export interface PerfStats {
  fps: number;
  targetFps: number;
  frameTimeMs: number;
  frameTimeMin: number;
  frameTimeMax: number;
  droppedFrames: number;
  cacheHitRate: number;
  cacheMemoryBytes: number;
  cacheBudgetBytes: number;
  quality: string;
  qualityScale: number;
}

export class PerfMonitor {
  private _maxSamples = 60;
  private _frameTimes: Float32Array;
  private _writeIdx = 0;
  private _filled = 0;
  private _sum = 0;

  private _fps = 0;
  private _droppedFrames = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _targetFps = 30;
  private _quality = 'full';
  private _qualityScale = 1;
  private _frameCache: FrameCache | null = null;
  private _cacheBudgetBytes = 2 * 1024 * 1024 * 1024;

  constructor() {
    this._frameTimes = new Float32Array(this._maxSamples);
  }

  setFrameCache(fc: FrameCache): void { this._frameCache = fc; }
  setTargetFps(fps: number): void { this._targetFps = fps; }
  setQuality(quality: string, scale: number): void {
    this._quality = quality;
    this._qualityScale = scale;
  }
  setCacheBudget(bytes: number): void { this._cacheBudgetBytes = bytes; }

  recordFrameTime(ms: number): void {
    if (this._filled === this._maxSamples) {
      this._sum -= this._frameTimes[this._writeIdx];
    } else {
      this._filled++;
    }
    this._frameTimes[this._writeIdx] = ms;
    this._sum += ms;
    this._writeIdx = (this._writeIdx + 1) % this._maxSamples;

    const avg = this._sum / this._filled;
    this._fps = avg > 0 ? Math.round(1000 / avg) : 0;
  }

  recordDroppedFrame(): void { this._droppedFrames++; }

  recordCacheAccess(hit: boolean): void {
    if (hit) this._cacheHits++; else this._cacheMisses++;
  }

  reset(): void {
    this._writeIdx = 0;
    this._filled = 0;
    this._sum = 0;
    this._droppedFrames = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
  }

  getStats(): PerfStats {
    const avg = this._filled > 0 ? this._sum / this._filled : 0;

    // Compute min/max only if requested and cache result briefly.
    let min = Infinity;
    let max = 0;
    if (this._filled > 0) {
      for (let i = 0; i < this._filled; i++) {
        const v = this._frameTimes[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (!isFinite(min)) min = 0;
    } else {
      min = 0;
    }

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
    this._frameCache = null;
  }
}