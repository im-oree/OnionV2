/**
 * RAMPreviewBuilder — renders frames into the FrameCache sequentially.
 *
 * ARCHITECTURE:
 * - When building, PAUSES the main render loop so it doesn't compete.
 * - Renders each frame via renderer's own scene/camera, synchronously.
 * - Uses gl.finish() before pixel readback to ensure GPU is done.
 * - Yields to the browser every N frames to keep UI responsive.
 * - RESUMES the main render loop when done or cancelled.
 *
 * Never mutates Zustand store state.
 */
import { FrameCache, type CacheQuality } from './FrameCache';
import { useCompositionStore } from '../../state/compositionStore';
import { useTimelineStore } from '../../state/timelineStore';
import { ModalTransform } from '../interaction/ModalTransform';
import type { Renderer } from '../Renderer';

export type PreviewBuildState =
  | 'idle'
  | 'building'
  | 'complete'
  | 'cancelled'
  | 'idle_caching';

export interface PreviewBuildProgress {
  state: PreviewBuildState;
  totalFrames: number;
  renderedFrames: number;
  currentFrame: number;
  quality: CacheQuality;
}

export class RAMPreviewBuilder {
  private _frameCache: FrameCache;
  private _rendererRef: (() => Renderer | null) | null = null;

  private _state: PreviewBuildState = 'idle';
  private _compId: string | null = null;
  private _startFrame = 0;
  private _endFrame = 0;
  private _currentFrame = 0;
  private _quality: CacheQuality = 'half';

  /** Monotonic build ID — cancels stale async loops */
  private _buildId = 0;

  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _onProgress: ((p: PreviewBuildProgress) => void) | null = null;
  private _onComplete: ((compId: string) => void) | null = null;

  // Idle caching
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _idleThresholdMs = 3000;

  /** Whether we've paused the main render loop for this build */
  private _pausedMainLoop = false;

  set onProgress(cb: ((p: PreviewBuildProgress) => void) | null) {
    this._onProgress = cb;
  }
  set onComplete(cb: ((compId: string) => void) | null) {
    this._onComplete = cb;
  }

  constructor(frameCache: FrameCache) {
    this._frameCache = frameCache;
  }

  setRendererRef(ref: () => Renderer | null): void {
    this._rendererRef = ref;
  }

  get state(): PreviewBuildState { return this._state; }

  get progress(): PreviewBuildProgress {
    return {
      state: this._state,
      totalFrames: Math.max(0, this._endFrame - this._startFrame),
      renderedFrames: Math.max(0, this._currentFrame - this._startFrame),
      currentFrame: this._currentFrame,
      quality: this._quality,
    };
  }

  get isBuilding(): boolean {
    return this._state === 'building' || this._state === 'idle_caching';
  }

  // ── Public API ────────────────────────────────────────────────

  startManualPreview(compId: string, quality: CacheQuality = 'half'): void {
    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp) {
      console.warn('[RAMPreview] No composition found:', compId);
      return;
    }

    this._cancelInternal();

    this._compId = compId;
    this._quality = quality;
    this._state = 'building';

    const totalFrames = Math.floor(comp.duration * comp.fps);
    const waStart =
      comp.workAreaStart != null
        ? Math.floor(comp.workAreaStart * comp.fps)
        : 0;
    const waEnd =
      comp.workAreaEnd != null
        ? Math.floor(comp.workAreaEnd * comp.fps)
        : totalFrames;
    this._startFrame = Math.max(0, waStart);
    this._endFrame = Math.min(totalFrames, waEnd);
    this._currentFrame = this._startFrame;

    console.log(
      `[RAMPreview] Starting manual build: frames ${this._startFrame}–${this._endFrame} (${quality})`,
    );

    // Pause the main render loop so it doesn't compete with our synchronous renders
    this._pauseMainLoop();

    const buildId = ++this._buildId;
    this._emitProgress();
    this._scheduleNextFrame(buildId, 0);
  }

  startBackgroundPrefetch(
    compId: string,
    playheadFrame: number,
    range = 60,
  ): void {
    if (this.isBuilding) return;
    if (useTimelineStore.getState().playbackState === 'playing') return;

    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp) return;

    this._compId = compId;
    this._quality = 'quarter';
    this._state = 'building';

    const totalFrames = Math.floor(comp.duration * comp.fps);
    this._startFrame = Math.max(0, playheadFrame);
    this._endFrame = Math.min(totalFrames, playheadFrame + range);
    this._currentFrame = this._startFrame;

    this._pauseMainLoop();

    const buildId = ++this._buildId;
    this._emitProgress();
    this._scheduleNextFrame(buildId, 4);
  }

  cancel(): void {
    this._cancelInternal();
    this._state = 'cancelled';
    this._resumeMainLoop();
    this._emitProgress();
  }

  // ── Idle caching ───────────────────────────────────────────────

  reportActivity(): void {
    if (this._state === 'idle_caching') {
      this._cancelInternal();
      this._resumeMainLoop();
      this._state = 'idle';
      this._emitProgress();
    }
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
    this._idleTimer = setTimeout(
      () => this._startIdleCaching(),
      this._idleThresholdMs,
    );
  }

  cancelIdleCaching(): void {
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
    if (this._state === 'idle_caching') {
      this._cancelInternal();
      this._resumeMainLoop();
      this._state = 'idle';
    }
  }

  // ── Internal ───────────────────────────────────────────────────

  private _startIdleCaching(): void {
    this._idleTimer = null;
    if (this.isBuilding) return;
    if (useTimelineStore.getState().playbackState === 'playing') return;
    if (!useTimelineStore.getState().autoCache) return;

    const compId = useCompositionStore.getState().activeCompositionId;
    if (!compId) return;

    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp) return;

    const playheadFrame = Math.floor(comp.currentTime * comp.fps);
    const totalFrames = Math.floor(comp.duration * comp.fps);

    this._compId = compId;
    this._quality = 'half';
    this._state = 'idle_caching';
    this._startFrame = playheadFrame;
    this._endFrame = Math.min(totalFrames, playheadFrame + 300);
    this._currentFrame = this._startFrame;

    this._pauseMainLoop();

    const buildId = ++this._buildId;
    this._emitProgress();
    this._scheduleNextFrame(buildId, 16);
  }

  private _cancelInternal(): void {
    this._buildId++;
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  private _pauseMainLoop(): void {
    if (this._pausedMainLoop) return;
    const renderer = this._rendererRef?.();
    if (renderer?.renderLoop) {
      renderer.renderLoop.pauseForCacheBuild();
      this._pausedMainLoop = true;
    }
  }

  private _resumeMainLoop(): void {
    if (!this._pausedMainLoop) return;
    const renderer = this._rendererRef?.();
    if (renderer?.renderLoop) {
      renderer.renderLoop.resumeFromCacheBuild();
    }
    this._pausedMainLoop = false;

    // Request one render so the display refreshes to show cached frames
    const r = this._rendererRef?.();
    r?.renderLoop.requestRender();
  }

  private _scheduleNextFrame(buildId: number, delayMs: number): void {
    this._timeoutId = setTimeout(
      () => this._buildNextFrame(buildId),
      delayMs,
    );
  }

  private _buildNextFrame(buildId: number): void {
    // Stale loop
    if (buildId !== this._buildId) return;

    // Cancelled
    if (this._state === 'cancelled' || this._state === 'idle') {
      this._resumeMainLoop();
      return;
    }

    // Playback started — abort
    if (useTimelineStore.getState().playbackState === 'playing') {
      this._cancelInternal();
      this._state = 'idle';
      this._resumeMainLoop();
      this._emitProgress();
      return;
    }

    // User dragging — pause build (don't cancel)
    if (ModalTransform.activeAnywhere) {
      this._timeoutId = setTimeout(
        () => this._buildNextFrame(buildId),
        200,
      );
      return;
    }

    // Build complete
    if (this._currentFrame > this._endFrame) {
      const wasManual = this._state === 'building';
      const compId = this._compId!;
      this._state = 'complete';

      // Forcefully restore scene state before resuming main loop.
      // This ensures layers are visible, overlay is shown, and the
      // cached frame quad is hidden — even if beforeRender doesn't
      // find a cached frame on the next render.
      const r = this._rendererRef?.();
      if (r) r.restoreLiveDisplay();

      this._resumeMainLoop();
      this._emitProgress();

      console.log(`[RAMPreview] Build complete: ${this._frameCache.size} frames cached`);

      if (wasManual) {
        document.dispatchEvent(
          new CustomEvent('rampreview:complete', { detail: { compId } }),
        );
        try { this._onComplete?.(compId); } catch {}
      }
      return;
    }

    // Skip already-cached frames
    if (
      this._frameCache.has(this._compId!, this._currentFrame, this._quality)
    ) {
      this._currentFrame++;
      this._emitProgress();
      this._scheduleNextFrame(buildId, 0);
      return;
    }

    // Render this frame
    const rendered = this._renderFrame(
      this._compId!,
      this._currentFrame,
      this._quality,
    );

    if (!rendered) {
      console.warn('[RAMPreview] Frame render returned false, aborting');
      this._state = 'cancelled';
      this._resumeMainLoop();
      this._emitProgress();
      return;
    }

    this._currentFrame++;
    this._emitProgress();

    // Yield strategy:
    // - Manual: every 4th frame yield 1ms, others 0ms (max throughput)
    // - Idle:   every frame yields 8ms (nice to user)
    const isIdle = this._state === 'idle_caching';
    const delay = isIdle ? 8 : this._currentFrame % 4 === 0 ? 1 : 0;
    this._scheduleNextFrame(buildId, delay);
  }

  /**
   * Render a single frame into the cache.
   * Uses the renderer's setCacheRenderTime API to render at a specific time
   * without mutating any Zustand store.
   */
  private _renderFrame(
    compId: string,
    frameNumber: number,
    _quality: CacheQuality,
  ): boolean {
    const renderer = this._rendererRef?.();
    if (!renderer) {
      console.warn('[RAMPreview] No renderer available');
      return false;
    }

    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp) return false;

    const targetTime = frameNumber / comp.fps;

    try {
      // Set the override time — this makes runBeforeRenderHooks() use it
      renderer.setCacheRenderTime(targetTime);

      // Update layer visibility, apply keyframes, process nested comps, effects
      renderer.runBeforeRenderHooks();

      // Render at whatever the current canvas resolution is
      // (we don't resize per-frame — that was thrashing the GPU)
      renderer.renderSynchronous();

      // Ensure GPU is done before reading pixels
      const gl = renderer.renderer.getContext();
      gl.finish();

      // Capture into cache — pass the current quality tag
      // (we're not actually rendering at reduced res anymore, but the
      // quality tag still helps callers know what they got)
      renderer.captureFrame(compId, frameNumber, _quality);

      return true;
    } catch (err) {
      console.error('[RAMPreview] Frame render error:', err);
      return false;
    } finally {
      renderer.clearCacheRenderTime();
    }
  }

  private _emitProgress(): void {
    try { this._onProgress?.(this.progress); } catch {}
  }

  dispose(): void {
    this._cancelInternal();
    this.cancelIdleCaching();
    this._resumeMainLoop();
    this._onProgress = null;
    this._onComplete = null;
    this._rendererRef = null;
  }
}