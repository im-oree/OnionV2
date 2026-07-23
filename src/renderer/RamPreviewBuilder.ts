/**
 * RamPreviewBuilder — AE-style RAM preview builder.
 *
 * Walks every frame in the composition sequentially, renders each one
 * via the live Renderer, captures the pixels into frameCache, then
 * emits progress events. Non-blocking: yields to the browser between
 * frames via setTimeout(0) so the UI stays responsive.
 *
 * Usage:
 *   ramPreviewBuilder.start(comp, renderer)
 *   ramPreviewBuilder.stop()
 *   ramPreviewBuilder.on('progress', ({ frame, total, fraction }) => ...)
 *   ramPreviewBuilder.on('complete', () => ...)
 *   ramPreviewBuilder.on('cancelled', () => ...)
 */

import type { Composition } from '../types/composition';
import { frameCache } from './cache/FrameCache';
import { useCompositionStore } from '../state/compositionStore';
import { useTimelineStore } from '../state/timelineStore';

export type RamPreviewEvent =
  | { type: 'progress'; frame: number; total: number; fraction: number; cachedFrames: number }
  | { type: 'complete'; totalCached: number }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

type EventHandler = (event: RamPreviewEvent) => void;

export class RamPreviewBuilder {
  private _running = false;
  private _cancelled = false;
  private _handlers: EventHandler[] = [];
  private _currentCompId: string | null = null;
  private _timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // How many ms to yield between frames so the UI stays responsive
  private static readonly YIELD_MS = 0;
  // Max frames to build in one burst before yielding
  private static readonly BURST = 1;

  get isRunning(): boolean { return this._running; }
  get currentCompId(): string | null { return this._currentCompId; }

  on(handler: EventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      this._handlers = this._handlers.filter(h => h !== handler);
    };
  }

  private _emit(event: RamPreviewEvent): void {
    for (const h of this._handlers) {
      try { h(event); } catch {}
    }
  }

  // ── Start ────────────────────────────────────────────────────

  start(comp: Composition): void {
    if (this._running) this.stop();

    this._running = true;
    this._cancelled = false;
    this._currentCompId = comp.id;

    // Pause live playback while building
    const playbackState = useTimelineStore.getState().playbackState;
    if (playbackState === 'playing') {
      useTimelineStore.getState().setPlaybackState('paused');
      const renderer = (window as any).__renderer;
      if (renderer) {
        renderer.pauseAllVideos?.();
        renderer.pauseAllAudio?.();
      }
    }

    const totalFrames = Math.max(1, Math.floor(comp.duration * comp.fps));

    // Only use work area if user explicitly enabled it
    const useWorkArea = !!comp.workAreaEnabled;
    const workStart = useWorkArea && comp.workAreaStart != null
      ? Math.floor(comp.workAreaStart * comp.fps)
      : 0;
    const workEnd = useWorkArea && comp.workAreaEnd != null
      ? Math.floor(comp.workAreaEnd * comp.fps)
      : totalFrames;

    const rangeStart = Math.max(0, workStart);
    const rangeEnd   = Math.min(totalFrames, workEnd);
    const rangeTotal = rangeEnd - rangeStart;

    if (rangeTotal <= 0) {
      this._running = false;
      this._emit({ type: 'complete', totalCached: 0 });
      return;
    }

    let frameIdx = rangeStart;
    let cachedThisRun = 0;

    const savedTime = comp.currentTime;

    const buildNextBurst = () => {
      if (this._cancelled || !this._running) {
        // Restore composition time
        useCompositionStore.getState().setCurrentTime(comp.id, savedTime);
        const renderer = (window as any).__renderer;
        if (renderer) renderer.renderLoop.requestRender();
        this._running = false;
        this._emit({ type: 'cancelled' });
        return;
      }

      // Re-fetch comp in case it changed (e.g. layer added)
      const cs = useCompositionStore.getState();
      const liveComp = cs.compositions.find(c => c.id === comp.id);
      if (!liveComp) {
        this._running = false;
        this._emit({ type: 'error', message: 'Composition was removed' });
        return;
      }

      for (let burst = 0; burst < RamPreviewBuilder.BURST; burst++) {
        if (frameIdx >= rangeEnd) break;

        const frame = frameIdx;
        frameIdx++;

        // Compute hash for this frame
        const hash = frameCache.hashFor(liveComp, frame);

        // Skip if already in RAM cache
        if (frameCache.ram.has(hash)) {
          const fraction = (frameIdx - rangeStart) / rangeTotal;
          this._emit({
            type: 'progress',
            frame,
            total: rangeTotal,
            fraction,
            cachedFrames: frameCache.ram.size,
          });
          continue;
        }

        // Set composition time to this frame
        const timeSec = frame / liveComp.fps;
        useCompositionStore.getState().setCurrentTimeSilent(liveComp.id, timeSec);

        // Trigger a synchronous render via the live renderer
        const renderer = (window as any).__renderer;
        if (!renderer) {
          this._running = false;
          this._emit({ type: 'error', message: 'Renderer not available' });
          // Restore time
          useCompositionStore.getState().setCurrentTime(comp.id, savedTime);
          return;
        }

        try {
          // Run before/after hooks exactly as the normal render loop does
          renderer.renderLoop.beforeRender?.();

          const canvas = renderer.renderer.domElement;
          const pr = renderer.renderer.getPixelRatio();
          renderer.renderer.setViewport(0, 0, canvas.width / pr, canvas.height / pr);
          renderer.renderer.setScissorTest(false);
          renderer.renderer.render(renderer.sceneManager.scene, renderer.renderLoop.getCamera());
          renderer.renderLoop.afterRender?.();

          // Capture pixels into frameCache
          const captured = frameCache.captureFromRenderer(
            renderer.renderer,
            hash,
            liveComp.id,
            frame,
          );

          if (captured) cachedThisRun++;
        } catch (err) {
          console.warn(`[RamPreviewBuilder] Frame ${frame} render error:`, err);
          // Continue with next frame rather than aborting
        }

        const fraction = (frameIdx - rangeStart) / rangeTotal;
        this._emit({
          type: 'progress',
          frame,
          total: rangeTotal,
          fraction,
          cachedFrames: frameCache.ram.size,
        });
      }

      // All frames done?
      if (frameIdx >= rangeEnd) {
        // Restore composition time
        useCompositionStore.getState().setCurrentTime(comp.id, savedTime);
        const renderer = (window as any).__renderer;
        if (renderer) renderer.renderLoop.requestRender();
        this._running = false;
        this._emit({ type: 'complete', totalCached: cachedThisRun });
        return;
      }

      // Yield to browser then continue
      this._timeoutHandle = setTimeout(buildNextBurst, RamPreviewBuilder.YIELD_MS);
    };

    // Kick off
    this._timeoutHandle = setTimeout(buildNextBurst, 0);
  }

  // ── Stop ─────────────────────────────────────────────────────

  stop(): void {
    this._cancelled = true;
    if (this._timeoutHandle !== null) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }
    if (this._running) {
      this._running = false;
      this._emit({ type: 'cancelled' });
    }
  }

  dispose(): void {
    this.stop();
    this._handlers = [];
  }
}

/** Singleton instance */
export const ramPreviewBuilder = new RamPreviewBuilder();