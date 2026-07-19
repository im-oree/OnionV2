/**
 * RenderScheduler — priority-based render orchestration.
 *
 * Integrates with RenderLoop: does NOT create its own RAF cycle.
 * Instead, the RenderLoop queries the scheduler's state during its tick.
 *
 * Priorities:
 * - Interactive: user actively editing → render at best quality
 * - Playback: playing back at frame rate → render each frame
 * - Background: idle prefetch → low priority
 * - No-op: nothing changed → don't render
 */
import type { CacheQuality } from './cache/FrameCache';
import type { AdaptiveResolution } from './cache/AdaptiveResolution';

export type RenderPriority = 'interactive' | 'playback' | 'background' | 'noop';

export interface RenderBudget {
  frameBudgetMs: number;
  renderTimeMs: number;
  quality: CacheQuality;
  droppedFrames: number;
  isOverBudget: boolean;
}

export class RenderScheduler {
  private _priority: RenderPriority = 'noop';
  private _frameBudgetMs = 33.3;
  private _renderTimeMs = 0;
  private _droppedFrames = 0;
  private _frameCount = 0;
  private _overBudgetSince = 0;
  private _adaptiveRes?: AdaptiveResolution;
  /** Callback invoked when a render request is made — set by Renderer to call renderLoop.requestRender() */
  private _onRequestRender: (() => void) | null = null;

  /** Callback fired when a render should be scheduled */
  set onRequestRender(cb: (() => void) | null) { this._onRequestRender = cb; }

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
      // Notify the render loop that rendering is needed
      this._onRequestRender?.();
    }
  }

  /** Called by RenderLoop after rendering — resets priority and reports timing */
  didRender(renderMs: number): void {
    this._renderTimeMs = renderMs;
    this._frameCount++;

    if (renderMs > this._frameBudgetMs * 0.9) {
      this._overBudgetSince++;
    } else {
      this._overBudgetSince = 0;
    }

    this._adaptiveRes?.recordFrameTime(renderMs, this._frameBudgetMs, this._priority);

    // Reset priority for next cycle
    this._priority = 'noop';
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

  /** Should a render happen this frame? */
  get shouldRender(): boolean {
    return this._priority !== 'noop';
  }

  /** Should the scheduler downgrade quality? */
  get shouldDowngrade(): boolean {
    return this._overBudgetSince >= 10;
  }

  /** Should the scheduler upgrade quality? */
  get shouldUpgrade(): boolean {
    return this._frameCount > 30 && this._renderTimeMs < this._frameBudgetMs * 0.5;
  }

  reset(): void {
    this._frameCount = 0;
    this._overBudgetSince = 0;
  }

  dispose(): void {
    this._adaptiveRes = undefined;
  }
}
