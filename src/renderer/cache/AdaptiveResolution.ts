/**
 * AdaptiveResolution — dynamically adjusts render quality based on frame render time.
 *
 * Modes: 'full' | 'half' | 'quarter' | 'auto'
 *
 * Auto mode:
 * - Monitors frame render time over a rolling window (last 30 frames)
 * - Budget = 1000 / fps
 * - If avg > 90% of budget for 10 consecutive frames: drop one quality level
 * - If avg < 50% of budget for 30 consecutive frames: raise one quality level
 * - Drop faster than raise
 */
import type { CacheQuality } from './FrameCache';
import type { RenderPriority } from '../RenderScheduler';

export type ResolutionMode = CacheQuality | 'auto';

const QUALITY_ORDER: CacheQuality[] = ['full', 'half', 'quarter'];
const QUALITY_FACTORS: Record<CacheQuality, number> = { full: 1, half: 0.5, quarter: 0.25 };

export class AdaptiveResolution {
  private _mode: ResolutionMode = 'auto';
  private _currentQuality: CacheQuality = 'full';
  private _frameTimes: number[] = [];
  private _maxWindow = 30;
  private _overBudgetCount = 0;
  private _underBudgetCount = 0;
  private _fps = 30;
  private _onQualityChange?: (quality: CacheQuality) => void;

  /** Callback when quality changes */
  set onQualityChange(cb: ((quality: CacheQuality) => void) | undefined) { this._onQualityChange = cb; }

  get currentQuality(): CacheQuality { return this._currentQuality; }
  get mode(): ResolutionMode { return this._mode; }

  /** Quality factor (1 = full, 0.5 = half, 0.25 = quarter) */
  get scaleFactor(): number { return QUALITY_FACTORS[this._currentQuality]; }

  /** Set the target FPS for budget calculation */
  setTargetFps(fps: number): void {
    this._fps = fps;
  }

  /** Set the resolution mode */
  setMode(mode: ResolutionMode): void {
    this._mode = mode;
    if (mode !== 'auto') {
      this._setQuality(mode);
    }
  }

  /** Record a frame's render time and adjust quality if needed */
  recordFrameTime(renderMs: number, budgetMs: number, _priority: RenderPriority): void {
    if (this._mode !== 'auto') return;

    this._frameTimes.push(renderMs);
    if (this._frameTimes.length > this._maxWindow) {
      this._frameTimes.shift();
    }

    const budget = budgetMs > 0 ? budgetMs : 1000 / this._fps;
    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;

    // Downgrade: if avg > 90% of budget for 10+ frames
    if (avg > budget * 0.9) {
      this._overBudgetCount++;
      this._underBudgetCount = 0;
    } else if (avg < budget * 0.5) {
      this._underBudgetCount++;
      this._overBudgetCount = 0;
    } else {
      this._overBudgetCount = 0;
      this._underBudgetCount = 0;
    }

    const currentIdx = QUALITY_ORDER.indexOf(this._currentQuality);

    // Drop quality quickly (10 frames over budget)
    if (this._overBudgetCount >= 10 && currentIdx < QUALITY_ORDER.length - 1) {
      const newQuality = QUALITY_ORDER[currentIdx + 1];
      this._setQuality(newQuality);
      this._overBudgetCount = 0;
      this._frameTimes = [];
    }

    // Raise quality slowly (30 frames under budget)
    if (this._underBudgetCount >= 30 && currentIdx > 0) {
      const newQuality = QUALITY_ORDER[currentIdx - 1];
      this._setQuality(newQuality);
      this._underBudgetCount = 0;
      this._frameTimes = [];
    }
  }

  /** Get the render scale factor for the current quality */
  getRenderScale(width: number, height: number): { width: number; height: number } {
    const f = this.scaleFactor;
    return {
      width: Math.max(1, Math.round(width * f)),
      height: Math.max(1, Math.round(height * f)),
    };
  }

  private _setQuality(quality: CacheQuality): void {
    if (this._currentQuality === quality) return;
    this._currentQuality = quality;
    this._frameTimes = [];
    this._overBudgetCount = 0;
    this._underBudgetCount = 0;
    this._onQualityChange?.(quality);
  }

  dispose(): void {
    this._frameTimes = [];
    this._onQualityChange = undefined;
  }
}
