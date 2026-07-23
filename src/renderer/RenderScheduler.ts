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

export type CacheQuality = 'full' | 'half' | 'quarter';

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
  /** Callback invoked when a render request is made — set by Renderer to call renderLoop.requestRender() */
  private _onRequestRender: (() => void) | null = null;

  /** Callback fired when a render should be scheduled */
  set onRequestRender(cb: (() => void) | null) { this._onRequestRender = cb; }

  get priority(): RenderPriority { return this._priority; }
  get frameBudgetMs(): number { return this._frameBudgetMs; }
  get renderTimeMs(): number { return this._renderTimeMs; }
  get droppedFrames(): number { return this._droppedFrames; }
  get isOverBudget(): boolean { return this._overBudgetSince > 0; }

  /** Set the frame budget based on target FPS */
  setFrameBudget(fps: number): void {
    this._frameBudgetMs = fps > 0 ? 1000 / fps : 33.3;
  }

  /** Request a render. Notifies the render loop that rendering is needed. */
  request(): void {
    this._onRequestRender?.();
  }

  /** Called by RenderLoop after rendering — reports timing */
  didRender(renderMs: number): void {
    this._renderTimeMs = renderMs;
    this._frameCount++;

    if (renderMs > this._frameBudgetMs) {
      if (this._overBudgetSince === 0) this._overBudgetSince = performance.now();
      this._droppedFrames++;
    } else {
      this._overBudgetSince = 0;
    }

    // Reset priority for next cycle
    this._priority = 'noop';
  }

  /** Mark a dropped frame */
  recordDroppedFrame(): void {
    this._droppedFrames++;
  }

  /** Get current render budget info */
  getBudget(): RenderBudget {
    return {
      frameBudgetMs: this._frameBudgetMs,
      renderTimeMs: this._renderTimeMs,
      quality: 'full',
      droppedFrames: this._droppedFrames,
      isOverBudget: this._renderTimeMs > this._frameBudgetMs,
    };
  }

  /** Should a render happen this frame? */
  get shouldRender(): boolean {
    return this._priority !== 'noop';
  }

  /** Should the scheduler downgrade quality? */
  get shouldDowngrade(): boolean {
    return false;
  }

  /** Should the scheduler upgrade quality? */
  get shouldUpgrade(): boolean {
    return true;
  }

  reset(): void {
    this._renderTimeMs = 0;
    this._droppedFrames = 0;
    this._frameCount = 0;
    this._overBudgetSince = 0;
  }

  dispose(): void {
    this._onRequestRender = null;
  }
}
