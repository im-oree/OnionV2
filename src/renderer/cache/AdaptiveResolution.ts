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

// Fix #3 — cooldown frames after a quality change to prevent oscillation
const POST_CHANGE_COOLDOWN = 15;

export class AdaptiveResolution {
  private _mode: ResolutionMode = 'auto';
  private _currentQuality: CacheQuality = 'full';

  // Fix #1 / #2 — track per-frame budget breaches, not rolling-average breaches
  private _frameTimes: number[] = [];
  private _frameRollingSum = 0; // Fix #10 — maintain rolling sum instead of re-reducing
  private _maxWindow = 30;

  private _overBudgetStreak = 0;   // consecutive frames where that frame's avg > 90% budget
  private _underBudgetStreak = 0;  // consecutive frames where that frame's avg < 50% budget

  // Fix #3 — cooldown counter
  private _cooldownFrames = 0;

  private _fps = 30;
  private _onQualityChange?: (quality: CacheQuality) => void;

  /** Callback when quality changes */
  set onQualityChange(cb: ((quality: CacheQuality) => void) | undefined) {
    this._onQualityChange = cb;
  }

  get currentQuality(): CacheQuality { return this._currentQuality; }
  get mode(): ResolutionMode { return this._mode; }

  /** Quality factor (1 = full, 0.5 = half, 0.25 = quarter) */
  get scaleFactor(): number { return QUALITY_FACTORS[this._currentQuality]; }

  /**
   * Set the target FPS for budget calculation.
   * Fix #4 — clamp fps to a safe minimum to prevent division by zero.
   */
  setTargetFps(fps: number): void {
    this._fps = Math.max(1, fps);
  }

  /**
   * Set the resolution mode.
   * Fix #8 — reset counters and cooldown when switching back to auto
   *          so stale history does not cause an instant quality jump.
   */
  setMode(mode: ResolutionMode): void {
    this._mode = mode;
    if (mode !== 'auto') {
      this._setQuality(mode);
    } else {
      // Entering auto: wipe history so we start fresh
      this._resetCounters(true);
    }
  }

  /**
   * Record a frame's render time and adjust quality if in auto mode.
   *
   * Fix #1  — streak counters now track whether THIS frame's rolling average
   *            is over/under budget, which correctly models "consecutive frames
   *            where the average stays above/below the threshold".
   * Fix #2  — under-budget check uses the same per-frame average comparison.
   * Fix #3  — a cooldown window after every quality change prevents thrashing.
   * Fix #4  — budget denominator is guarded by setTargetFps clamp.
   * Fix #5  — budgetMs is used only when explicitly positive; otherwise we
   *            always derive from the single source of truth (_fps).
   * Fix #9  — drop and raise are now if / else if so both cannot fire together.
   */
  recordFrameTime(renderMs: number, budgetMs: number, priority: RenderPriority): void {
    if (this._mode !== 'auto') return;

    // Fix #5 — single clear source for budget
    const budget = budgetMs > 0 ? budgetMs : 1000 / this._fps;

    // Fix #10 — O(1) rolling average via running sum
    this._frameTimes.push(renderMs);
    this._frameRollingSum += renderMs;
    if (this._frameTimes.length > this._maxWindow) {
      this._frameRollingSum -= this._frameTimes.shift()!;
    }

    const avg = this._frameRollingSum / this._frameTimes.length;

    // Fix #3 — skip decisions while cooling down
    if (this._cooldownFrames > 0) {
      this._cooldownFrames--;
      return;
    }

    // Fix #1 / #2 — correctly track consecutive frames above/below threshold
    if (avg > budget * 0.9) {
      this._overBudgetStreak++;
      this._underBudgetStreak = 0;
    } else if (avg < budget * 0.5) {
      this._underBudgetStreak++;
      this._overBudgetStreak = 0;
    } else {
      this._overBudgetStreak = 0;
      this._underBudgetStreak = 0;
    }

    // Fix #7 — safe index lookup with explicit guard
    const currentIdx = QUALITY_ORDER.indexOf(this._currentQuality);
    if (currentIdx === -1) {
      // Corrupted state — reset to full and bail
      this._setQuality('full');
      return;
    }

    // Fix #9 — else-if so drop and raise cannot both fire in the same call
    // Drop quality quickly (10 consecutive frames over budget)
    if (this._overBudgetStreak >= 10 && currentIdx < QUALITY_ORDER.length - 1) {
      this._setQuality(QUALITY_ORDER[currentIdx + 1]);

    // Raise quality slowly (30 consecutive frames under budget)
    } else if (this._underBudgetStreak >= 30 && currentIdx > 0) {
      this._setQuality(QUALITY_ORDER[currentIdx - 1]);
    }

    // Fix #6 — priority is intentionally unused in this implementation.
    // It is accepted so callers can pass scheduling context without needing
    // a separate code path; future versions may use it for priority-weighted
    // budget scaling. Marked void to silence lint warnings.
    void priority;
  }

  /** Get the render dimensions for the current quality level */
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

    // Fix #3 — start cooldown; also wipe history so stale data
    //          from the old quality level does not pollute decisions.
    this._resetCounters(true);
    this._cooldownFrames = POST_CHANGE_COOLDOWN;

    this._onQualityChange?.(quality);
  }

  /**
   * Reset streak counters and optionally clear the frame-time window.
   * Fix #8 — exposed internally so setMode('auto') can also call it.
   */
  private _resetCounters(clearWindow: boolean): void {
    this._overBudgetStreak = 0;
    this._underBudgetStreak = 0;
    if (clearWindow) {
      this._frameTimes = [];
      this._frameRollingSum = 0;
    }
  }

  dispose(): void {
    this._frameTimes = [];
    this._frameRollingSum = 0;
    this._onQualityChange = undefined;
  }
}