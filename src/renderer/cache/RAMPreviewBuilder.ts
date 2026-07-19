/**
 * RAMPreviewBuilder — renders frames into the FrameCache in the background.
 *
 * Modes:
 * - Manual: renders work area frames, then signals playback to start from cache
 * - Background: renders frames around the playhead (prefetch)
 * - Idle: auto-caches forward from playhead when user is idle for 2s
 *
 * Uses setTimeout to yield between frames for non-blocking operation.
 */
import { FrameCache, type CacheQuality } from './FrameCache';
import { useCompositionStore } from '../../state/compositionStore';
import { Renderer } from '../Renderer';
import { ModalTransform } from '../interaction/ModalTransform';

export type PreviewBuildState = 'idle' | 'building' | 'complete' | 'cancelled' | 'idle_caching';

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
  private _cancelled = false;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _onProgress: ((p: PreviewBuildProgress) => void) | null = null;
  private _onComplete: ((compId: string) => void) | null = null;

  // ── Idle caching state ──
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _idleThresholdMs = 2000;
  private _lastActivityTime = 0;
  private _onIdleCacheFrame: (() => void) | null = null;

  /** Callback fired when progress changes */
  set onProgress(cb: ((p: PreviewBuildProgress) => void) | null) { this._onProgress = cb; }
  /** Callback fired when manual preview build completes */
  set onComplete(cb: ((compId: string) => void) | null) { this._onComplete = cb; }
  /** Callback fired when idle caching renders a frame (e.g. to update UI) */
  set onIdleCacheFrame(cb: (() => void) | null) { this._onIdleCacheFrame = cb; }

  constructor(frameCache: FrameCache) {
    this._frameCache = frameCache;
  }

  /** Set a function that returns the current Renderer (lazy, avoids circular refs) */
  setRendererRef(ref: () => Renderer | null): void {
    this._rendererRef = ref;
  }

  get state(): PreviewBuildState { return this._state; }
  get progress(): PreviewBuildProgress {
    return {
      state: this._state,
      totalFrames: this._endFrame - this._startFrame,
      renderedFrames: this._currentFrame - this._startFrame,
      currentFrame: this._currentFrame,
      quality: this._quality,
    };
  }

  /**
   * Start a full RAM preview build of the given comp's work area (or full duration).
   * When complete, signals playback to start from cached frames.
   */
  startManualPreview(compId: string, quality: CacheQuality = 'half'): void {
    const state = useCompositionStore.getState();
    const comp = state.compositions.find(c => c.id === compId);
    if (!comp) return;

    this._compId = compId;
    this._quality = quality;
    this._cancelled = false;
    this._state = 'building';

    const totalFrames = Math.floor(comp.duration * comp.fps);
    const waStart = comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : 0;
    const waEnd = comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : totalFrames;
    this._startFrame = Math.max(0, waStart);
    this._endFrame = Math.min(totalFrames, waEnd);
    this._currentFrame = this._startFrame;

    this._emitProgress();
    this._buildNextFrame();
  }

  /**
   * Start background prefetch around the given playhead frame.
   * Renders at reduced quality with low priority (yields often).
   */
  startBackgroundPrefetch(compId: string, playheadFrame: number, range: number = 60): void {
    const state = useCompositionStore.getState();
    const comp = state.compositions.find(c => c.id === compId);
    if (!comp) return;

    // Don't start if manual build is running
    if (this._state === 'building' && !this._cancelled) return;

    this._compId = compId;
    this._quality = 'quarter';
    this._cancelled = false;
    this._state = 'building';

    const totalFrames = Math.floor(comp.duration * comp.fps);
    this._startFrame = Math.max(0, playheadFrame - range);
    this._endFrame = Math.min(totalFrames, playheadFrame + range);
    this._currentFrame = this._startFrame;

    this._buildNextFrame();
  }

  /** Cancel any ongoing build */
  cancel(): void {
    this._cancelled = true;
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this._state = 'cancelled';
    this._emitProgress();
  }

  get isBuilding(): boolean {
    return this._state === 'building' || this._state === 'idle_caching';
  }

  // ── Idle caching from playhead ────────────────────────────────

  /** Report user activity — resets the idle timer. Call on mouse/keyboard events. */
  reportActivity(): void {
    this._lastActivityTime = performance.now();
    if (this._state === 'idle_caching') {
      this.cancel();
    }
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => this._checkIdleAndCache(), this._idleThresholdMs);
  }

  /** Cancel idle caching timer */
  cancelIdleCaching(): void {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }

  private _checkIdleAndCache(): void {
    const compId = useCompositionStore.getState().activeCompositionId;
    if (!compId) return;
    if (this._state === 'building') return;

    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;

    const playheadFrame = Math.floor(comp.currentTime * comp.fps);
    const totalFrames = Math.floor(comp.duration * comp.fps);

    // Start caching from playhead forward (up to 300 frames ahead)
    this.startBackgroundPrefetch(compId, playheadFrame, Math.min(300, totalFrames - playheadFrame));
    this._state = 'idle_caching';
    this._emitProgress();
  }

  // ── Core build loop ───────────────────────────────────────────

  private _buildNextFrame(): void {
    if (this._cancelled || this._currentFrame > this._endFrame) {
      this._state = this._cancelled ? 'cancelled' : 'complete';
      this._emitProgress();

      // Signal completion for manual previews only
      if (this._state === 'complete' && this._compId) {
        document.dispatchEvent(new CustomEvent('rampreview:complete', { detail: { compId: this._compId } }));
        if (typeof this._onComplete === 'function') {
          try { this._onComplete(this._compId); } catch {}
        }
      }
      return;
    }

    // Pause build if modal transform is active (user dragging)
    if (ModalTransform.activeAnywhere) {
      this._timeoutId = setTimeout(() => this._buildNextFrame(), 200);
      return;
    }

    // If idle caching and user resumed activity, cancel gracefully
    if (this._state === 'idle_caching' && performance.now() - this._lastActivityTime < this._idleThresholdMs) {
      this.cancel();
      return;
    }

    // Skip if already cached
    if (this._frameCache.has(this._compId!, this._currentFrame, this._quality)) {
      this._currentFrame++;
      this._timeoutId = setTimeout(() => this._buildNextFrame(), 0);
      this._emitProgress();
      return;
    }

    const renderer = this._rendererRef?.();
    if (!renderer) { this._state = 'cancelled'; this._emitProgress(); return; }

    const comp = useCompositionStore.getState().compositions.find(c => c.id === this._compId);
    if (!comp) { this._state = 'cancelled'; this._emitProgress(); return; }

    // === Render and capture WITHOUT triggering Zustand subscribers ===
    const existingQuality = renderer.adaptiveResolution.currentQuality;
    renderer.adaptiveResolution.setMode(this._quality);

    const targetTime = this._currentFrame / comp.fps;
    const compId = this._compId!;
    const origTime = comp.currentTime;

    // Directly mutate currentTime to avoid React re-renders
    const compInStore = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (compInStore) (compInStore as any).currentTime = targetTime;

    renderer.runBeforeRenderHooks();

    try {
      renderer.renderSynchronous();
    } catch {
      renderer.renderLoop.requestRender();
    }

    renderer.captureFrame(compId, this._currentFrame, this._quality);

    // Restore original time
    if (compInStore) (compInStore as any).currentTime = origTime;
    renderer.adaptiveResolution.setMode(existingQuality);

    this._currentFrame++;
    this._emitProgress();

    // Fire idle cache frame callback (for CacheIndicator updates)
    if (this._state === 'idle_caching') {
      this._onIdleCacheFrame?.();
    }

    // Yield to avoid blocking — longer yields when idle caching
    const yieldMs = this._state === 'idle_caching' ? (this._currentFrame % 3 === 0 ? 2 : 0) : (this._currentFrame % 5 === 0 ? 1 : 0);
    this._timeoutId = setTimeout(() => this._buildNextFrame(), yieldMs);
  }

  private _emitProgress(): void {
    this._onProgress?.(this.progress);
  }

  dispose(): void {
    this.cancel();
    this.cancelIdleCaching();
    this._onProgress = null;
    this._onComplete = null;
    this._onIdleCacheFrame = null;
    this._rendererRef = null;
  }
}
