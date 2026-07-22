/**
 * RAMPreviewBuilder — renders frames into the FrameCache sequentially.
 *
 * - Pauses main render loop while building.
 * - Renders synchronously via renderer scene/camera.
 * - Uses gl.finish() before capture.
 * - Yields periodically to keep UI responsive.
 * - Never mutates Zustand state.
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

  private _buildId = 0;

  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _onProgress: ((p: PreviewBuildProgress) => void) | null = null;
  private _onComplete: ((compId: string) => void) | null = null;

  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _idleThresholdMs = 3000;

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
    const total = Math.max(0, this._endFrame - this._startFrame + 1);
    const rendered = Math.max(
      0,
      Math.min(total, this._currentFrame - this._startFrame),
    );

    return {
      state: this._state,
      totalFrames: total,
      renderedFrames: rendered,
      currentFrame: this._currentFrame,
      quality: this._quality,
    };
  }

  get isBuilding(): boolean {
    return (
      this._state === 'building' ||
      this._state === 'idle_caching'
    );
  }

  // ── Public API ────────────────────────────────────────────────

  startManualPreview(
    compId: string,
    quality: CacheQuality = 'half',
  ): void {
    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp) return;

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
    this._endFrame = Math.min(totalFrames - 1, waEnd);
    this._currentFrame = this._startFrame;

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

    this._cancelInternal();

    this._compId = compId;
    this._quality = 'quarter';
    this._state = 'building';

    const totalFrames = Math.floor(comp.duration * comp.fps);
    this._startFrame = Math.max(0, playheadFrame);
    this._endFrame = Math.min(
      totalFrames - 1,
      playheadFrame + range,
    );
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

    const compId =
      useCompositionStore.getState().activeCompositionId;
    if (!compId) return;

    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp) return;

    const playheadFrame = Math.floor(
      comp.currentTime * comp.fps,
    );
    const totalFrames = Math.floor(comp.duration * comp.fps);

    this._cancelInternal();

    this._compId = compId;
    this._quality = 'half';
    this._state = 'idle_caching';
    this._startFrame = playheadFrame;
    this._endFrame = Math.min(
      totalFrames - 1,
      playheadFrame + 300,
    );
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
      renderer.renderLoop.requestRender();
    }

    this._pausedMainLoop = false;
  }

  private _scheduleNextFrame(
    buildId: number,
    delayMs: number,
  ): void {
    this._timeoutId = setTimeout(
      () => this._buildNextFrame(buildId),
      delayMs,
    );
  }

  private _buildNextFrame(buildId: number): void {
    if (buildId !== this._buildId) return;
    if (!this._compId) return;

    if (
      this._state === 'cancelled' ||
      this._state === 'idle'
    ) {
      this._resumeMainLoop();
      return;
    }

    if (
      useTimelineStore.getState().playbackState ===
      'playing'
    ) {
      this._cancelInternal();
      this._state = 'idle';
      this._resumeMainLoop();
      this._emitProgress();
      return;
    }

    if (ModalTransform.activeAnywhere) {
      this._timeoutId = setTimeout(
        () => this._buildNextFrame(buildId),
        200,
      );
      return;
    }

    if (this._currentFrame > this._endFrame) {
      const wasManual = this._state === 'building';
      const compId = this._compId;

      this._state = 'complete';

      const r = this._rendererRef?.();
      r?.restoreLiveDisplay();

      this._resumeMainLoop();
      this._emitProgress();

      if (wasManual && compId) {
        document.dispatchEvent(
          new CustomEvent('rampreview:complete', {
            detail: { compId },
          }),
        );
        try { this._onComplete?.(compId); } catch {}
      }

      return;
    }

    if (
      this._frameCache.has(
        this._compId,
        this._currentFrame,
        this._quality,
      )
    ) {
      this._currentFrame++;
      this._emitProgress();
      this._scheduleNextFrame(buildId, 0);
      return;
    }

    const rendered = this._renderFrame(
      this._compId,
      this._currentFrame,
      this._quality,
    );

    if (!rendered) {
      this._state = 'cancelled';
      this._resumeMainLoop();
      this._emitProgress();
      return;
    }

    this._currentFrame++;
    this._emitProgress();

    const isIdle = this._state === 'idle_caching';
    const delay = isIdle
      ? 8
      : this._currentFrame % 4 === 0
        ? 1
        : 0;

    this._scheduleNextFrame(buildId, delay);
  }

  private _renderFrame(
    compId: string,
    frameNumber: number,
    quality: CacheQuality,
  ): boolean {
    const renderer = this._rendererRef?.();
    if (!renderer) return false;

    const comp = useCompositionStore
      .getState()
      .compositions.find((c) => c.id === compId);
    if (!comp || comp.fps <= 0) return false;

    const targetTime = frameNumber / comp.fps;

    try {
      renderer.setCacheRenderTime(targetTime);
      renderer.runBeforeRenderHooks();
      renderer.renderSynchronous();

      const gl = renderer.renderer.getContext();
      gl?.finish?.();

      renderer.captureFrame(compId, frameNumber, quality);

      return true;
    } catch {
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