/**
 * ScrubPrewarmer — caches frames around the playhead on scrub.
 *
 * When the user scrubs to an uncached frame, this fires a short
 * background burst that caches the next N frames in both directions.
 * Makes subsequent scrubbing feel instant.
 *
 * Non-blocking: one frame per setTimeout(0) tick.
 */
import type { Composition } from '../types/composition';
import { frameCache } from './cache/FrameCache';
import { useCompositionStore } from '../state/compositionStore';

const PREWARM_RADIUS = 15; // frames in each direction
const PREWARM_YIELD_MS = 4; // ms between frames (keep UI responsive)

export class ScrubPrewarmer {
  private _handle: ReturnType<typeof setTimeout> | null = null;
  private _running = false;
  private _lastTriggerFrame = -1;

  /**
   * Trigger a pre-warm burst around `centerFrame`.
   * Debounced — calling rapidly (scrub) only starts one burst.
   * Cancels any in-progress burst from a previous scrub position.
   */
  trigger(comp: Composition, centerFrame: number): void {
    // Debounce: only restart if the frame changed meaningfully
    if (
      this._running &&
      Math.abs(centerFrame - this._lastTriggerFrame) < 3
    ) {
      return;
    }

    this.cancel();
    this._lastTriggerFrame = centerFrame;

    const totalFrames = Math.floor(comp.duration * comp.fps);
    const start = Math.max(0, centerFrame - PREWARM_RADIUS);
    const end   = Math.min(totalFrames - 1, centerFrame + PREWARM_RADIUS);

    // Build the list of uncached frames, prioritising closest first
    const uncached: number[] = [];
    for (let offset = 0; offset <= PREWARM_RADIUS; offset++) {
      const fwd = centerFrame + offset;
      const bwd = centerFrame - offset;
      if (fwd <= end && fwd !== centerFrame) {
        const h = frameCache.hashFor(comp, fwd);
        if (!frameCache.ram.has(h)) uncached.push(fwd);
      }
      if (bwd >= start && bwd !== centerFrame && bwd !== fwd) {
        const h = frameCache.hashFor(comp, bwd);
        if (!frameCache.ram.has(h)) uncached.push(bwd);
      }
    }

    if (uncached.length === 0) return;

    this._running = true;
    let idx = 0;

    const next = () => {
      if (!this._running || idx >= uncached.length) {
        this._running = false;
        return;
      }

      const frame = uncached[idx++];
      const renderer = (window as any).__renderer;
      if (!renderer) { this._running = false; return; }

      // Re-fetch live comp (may have changed since scrub started)
      const liveComp = useCompositionStore.getState().compositions.find(
        c => c.id === comp.id,
      );
      if (!liveComp) { this._running = false; return; }

      const hash = frameCache.hashFor(liveComp, frame);
      if (frameCache.ram.has(hash)) {
        // Already cached (maybe the render loop got it) — skip
        this._handle = setTimeout(next, 0);
        return;
      }

      try {
        const timeSec = frame / liveComp.fps;
        useCompositionStore.getState().setCurrentTimeSilent(liveComp.id, timeSec);

        renderer.renderLoop.beforeRender?.();

        const canvas = renderer.renderer.domElement;
        const pr = renderer.renderer.getPixelRatio();
        renderer.renderer.setViewport(0, 0, canvas.width / pr, canvas.height / pr);
        renderer.renderer.setScissorTest(false);
        renderer.renderer.render(
          renderer.sceneManager.scene,
          renderer.renderLoop.getCamera(),
        );
        renderer.renderLoop.afterRender?.();

        frameCache.captureFromRenderer(
          renderer.renderer,
          hash,
          liveComp.id,
          frame,
        );
      } catch {
        // Non-fatal — just skip this frame
      }

      this._handle = setTimeout(next, PREWARM_YIELD_MS);
    };

    this._handle = setTimeout(next, PREWARM_YIELD_MS);
  }

  cancel(): void {
    this._running = false;
    if (this._handle !== null) {
      clearTimeout(this._handle);
      this._handle = null;
    }
  }

  get isRunning(): boolean { return this._running; }

  dispose(): void {
    this.cancel();
  }
}

export const scrubPrewarmer = new ScrubPrewarmer();