/**
 * RenderScheduler — central authority for when to render.
 *
 * Priorities:
 * - Interactive: user actively editing/dragging → render immediately at best quality
 * - Playback: playing back at frame rate → render each frame, drop quality if over budget
 * - Background: idle prefetch → low priority, yield often
 * - No-op: nothing changed → don't render
 *
 * Coalesces multiple change requests within a single RAF cycle.
 */
import type { CacheQuality } from './cache/FrameCache';
import type { AdaptiveResolution } from './cache/AdaptiveResolution';

export type RenderPriority = 'interactive' | 'playback' | 'background' | 'noop';

export interface RenderBudget {
  frameBudgetMs: number;   // e.g. 33.3ms for 30fps, 16.6ms for 60fps
  renderTimeMs: number;     // time spent rendering last frame
  quality: CacheQuality;    // current adaptive quality
  droppedFrames: number;    // count of frames dropped this session
  isOverBudget: boolean;    // true if renderTime exceeded budget last frame
}

export class RenderScheduler {
  private _priority: RenderPriority = 'noop';
  private _requested = false;
  private _frameBudgetMs = 33.3;
  private _renderTimeMs = 0;
  private _droppedFrames = 0;
  private _frameCount = 0;
  private _overBudgetSince = 0;
  private _adaptiveRes?: AdaptiveResolution;
  private _onScheduled: (() => void) | null = null;

  /** Callback fired when a render should happen */
  set onScheduled(cb: (() => void) | null) { this._onScheduled = cb; }

  setAdaptiveResolution(ar: AdaptiveResolution): void {
    this._adaptiveRes = ar;
  }

  get priority(): RenderPriority { return this._priority; }
  get frameBudgetMs(): number { return this._frameBudgetMs; }
  get renderTimeMs(): number { return this._renderTimeMs; }
  get droppedFrames(): number { return this._droppedFrames; }
  get isOverBudget(): boolean { return this._overBudgetSince > 0; }

  /** Set the frame budget based on target FPS */
  setFrameBudget(fps: number): void {
    this._frameBudgetMs = fps > 0 ? 1000 / fps : 33.3;
  }

  /** Request a render at the given priority. Higher priority preempts lower. */
  request(priority: RenderPriority): void {
    const order: RenderPriority[] = ['noop', 'background', 'playback', 'interactive'];

    if (order.indexOf(priority) > order.indexOf(this._priority)) {
      this._priority = priority;
    }

    if (!this._requested) {
      this._requested = true;
      requestAnimationFrame(() => this._flush());
    }
  }

  /** Record render time for adaptive quality adjustment */
  recordRenderTime(ms: number): void {
    this._renderTimeMs = ms;
    this._frameCount++;

    if (ms > this._frameBudgetMs * 0.9) {
      this._overBudgetSince++;
    } else {
      this._overBudgetSince = 0;
    }

    // Notify adaptive resolution
    this._adaptiveRes?.recordFrameTime(ms, this._frameBudgetMs, this._priority);
  }

  /** Mark a dropped frame */
  recordDroppedFrame(): void {
    this._droppedFrames++;
  }

  /** Get current render budget info */
  getBudget(): RenderBudget {
    const quality = this._adaptiveRes?.currentQuality ?? 'full';
    return {
      frameBudgetMs: this._frameBudgetMs,
      renderTimeMs: this._renderTimeMs,
      quality,
      droppedFrames: this._droppedFrames,
      isOverBudget: this._overBudgetSince > 0,
    };
  }

  /** Should the scheduler downgrade quality? */
  get shouldDowngrade(): boolean {
    return this._overBudgetSince >= 10; // over budget for 10+ consecutive frames
  }

  /** Should the scheduler upgrade quality? */
  get shouldUpgrade(): boolean {
    return this._frameCount > 30 && this._renderTimeMs < this._frameBudgetMs * 0.5;
  }

  /** Reset counters (e.g., on quality change) */
  reset(): void {
    this._frameCount = 0;
    this._overBudgetSince = 0;
  }

  private _flush(): void {
    this._requested = false;

    if (this._priority === 'noop') return;

    this._onScheduled?.();

    // Reset priority to allow next request
    this._priority = 'noop';
  }

  dispose(): void {
    this._onScheduled = null;
  }
}
