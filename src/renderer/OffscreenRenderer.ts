/**
 * OffscreenRenderer — optional renderer that moves Three.js rendering to a
 * Web Worker via OffscreenCanvas when the browser supports it.
 *
 * Note: Three.js has limited OffscreenCanvas support. This module provides
 * detection and a fallback to main-thread rendering. Enable as opt-in.
 *
 * Usage:
 *   const offscreen = new OffscreenRenderer(container);
 *   if (offscreen.supported) { offscreen.start(); }
 *   else { fall back to regular Renderer }
 *
 * Worker lifecycle:
 *   - Main thread posts state deltas (composition changes, camera, layers)
 *   - Worker runs Three.js renderer on a transferred OffscreenCanvas
 *   - Worker posts rendered ImageBitmap back for compositing
 */

export function isOffscreenCanvasSupported(): boolean {
  try {
    return (
      typeof OffscreenCanvas !== 'undefined' &&
      typeof OffscreenCanvas.prototype.getContext === 'function' &&
      // WebGL2 in worker is supported in Chromium 94+
      typeof (HTMLCanvasElement.prototype as any).transferControlToOffscreen === 'function'
    );
  } catch {
    return false;
  }
}

export class OffscreenRenderer {
  private _supported = false;
  private _worker: Worker | null = null;
  private _container: HTMLElement | null = null;
  private _offscreen: OffscreenCanvas | null = null;
  private _running = false;

  get supported(): boolean { return this._supported; }
  get isRunning(): boolean { return this._running; }

  constructor(container: HTMLElement) {
    this._supported = isOffscreenCanvasSupported();
    this._container = container;
  }

  /**
   * Start offscreen rendering by transferring canvas control to a worker.
   * Falls back silently if unsupported.
   */
  start(workerUrl: string = '/workers/offscreenRendererWorker.js'): boolean {
    if (!this._supported || !this._container) return false;
    if (this._running) return true;

    try {
      // Create an <canvas> element in the container
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      this._container.appendChild(canvas);

      // Transfer control to offscreen
      const offscreen = (canvas as any).transferControlToOffscreen() as OffscreenCanvas;
      this._offscreen = offscreen;

      // Create worker
      this._worker = new Worker(workerUrl);

      // Transfer the offscreen canvas to the worker
      this._worker.postMessage(
        { type: 'init', canvas: offscreen, width: canvas.width, height: canvas.height },
        [offscreen],
      );

      // Listen for rendered frames
      this._worker.onmessage = (e) => {
        // Worker sends back stats and rendered frame data
        if (e.data?.type === 'frame') {
          // The bitmap is auto-displayed on the canvas via the transferred OffscreenCanvas
        }
      };

      this._worker.onerror = (err) => {
        console.error('[OffscreenRenderer] Worker error:', err);
      };

      this._running = true;
      return true;
    } catch (err) {
      console.warn('[OffscreenRenderer] Failed to start:', err);
      this._supported = false;
      this._cleanup();
      return false;
    }
  }

  /** Post a state update to the offscreen worker */
  postMessage(msg: Record<string, unknown>): void {
    if (!this._worker || !this._running) return;
    this._worker.postMessage(msg);
  }

  /** Resize the offscreen canvas */
  resize(width: number, height: number): void {
    if (!this._worker || !this._running) return;
    this._worker.postMessage({ type: 'resize', width, height });
  }

  private _cleanup(): void {
    this._worker?.terminate();
    this._worker = null;
    this._offscreen = null;
  }

  stop(): void {
    this._cleanup();
    this._running = false;
  }

  dispose(): void {
    this.stop();
    this._container = null;
  }
}
