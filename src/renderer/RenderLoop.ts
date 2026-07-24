/**
 * RenderLoop — manages the requestAnimationFrame render cycle.
 *
 * Supports two playback modes:
 *   normal    — standard RAF + Three.js render pipeline
 *   blit-only — cache-only playback via setInterval blitting
 *               (zero GPU render cost when all frames are cached)
 */
import * as THREE from 'three';
import { VIEWPORT_CONFIG } from '../config/viewportConfig';

export interface FrameStats {
  deltaMs: number;
  fps: number;
  frameCount: number;
}

export type PlaybackMode = 'normal' | 'blit-only';

export class RenderLoop {
  public renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private lastRenderTime = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private fpsFrames = 0;
  private _currentFps = 0;
  private running = false;
  private _onFrame?: (stats: FrameStats) => void;

  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private needsRender = false;
  private _idlePaused = false;

  private _targetFps = 0;
  private _interactive = false;

  // ── Blit-only mode ─────────────────────────────────────────
  private _playbackMode: PlaybackMode = 'normal';
  private _blitIntervalId: ReturnType<typeof setInterval> | null = null;
  private _blitFrameCallback: ((frame: number) => boolean) | null = null;
  private _blitCurrentFrame = 0;
  private _blitStartFrame = 0;
  private _blitEndFrame = 0;
  private _blitLoop = false;
  private _blitLastTime = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /** Swap in a new renderer instance after a backend hot-swap. */
  updateRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.requestRender();
  }

  public beforeRender: (() => void) | null = null;
  public afterRender: (() => void) | null = null;
  public onFrameDropped: (() => void) | null = null;

  /** Called each blit frame with the frame number. Return false to stop. */
  public onBlitFrame: ((frame: number, timeSec: number) => void) | null = null;
  /** Called when blit-only playback reaches the end */
  public onBlitEnd: (() => void) | null = null;

  set onFrame(cb: ((stats: FrameStats) => void) | undefined) {
    this._onFrame = cb;
  }

  get playbackMode(): PlaybackMode { return this._playbackMode; }
  get isBlitMode(): boolean { return this._playbackMode === 'blit-only'; }

  setTargetFps(fps: number): void {
    this._targetFps = Math.max(0, fps);
  }

  setInteractive(v: boolean): void {
    this._interactive = v;
    this.requestRender();
  }

  requestRender(): void {
    this.needsRender = true;
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    if (this._idlePaused && this.running) {
      this._idlePaused = false;
      this.lastTime = performance.now();
      this.tick(this.lastTime);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this._idlePaused = false;
    this.lastTime = performance.now();
    this.lastRenderTime = 0;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    this._idlePaused = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    this._stopBlitLoop();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  getCamera(): THREE.Camera { return this.camera; }
  get isRunning(): boolean { return this.running; }
  get currentFps(): number { return this._currentFps; }
  get idlePaused(): boolean { return this._idlePaused; }
  get targetFps(): number { return this._targetFps; }

  // ── Blit-only playback API ──────────────────────────────────

  /**
   * Switch to cache-only blit playback.
   *
   * @param startFrame  First frame to blit
   * @param endFrame    Last frame (exclusive)
   * @param fps         Target playback FPS
   * @param loop        Whether to loop at end
   * @param getFrame    Callback — given frame number, blit it to screen.
   *                    Returns true if the frame was available, false to
   *                    fall back to normal render mode.
   */
  startBlitPlayback(
    startFrame: number,
    endFrame: number,
    fps: number,
    loop: boolean,
    getFrame: (frame: number) => boolean,
  ): void {
    this._stopBlitLoop();
    this._playbackMode = 'blit-only';
    this._blitCurrentFrame = startFrame;
    this._blitStartFrame = startFrame;
    this._blitEndFrame = endFrame;
    this._blitLoop = loop;
    this._blitFrameCallback = getFrame;
    this._blitLastTime = performance.now();

    const intervalMs = Math.max(8, 1000 / fps);

    this._blitIntervalId = setInterval(() => {
      this._blitTick();
    }, intervalMs);
  }

  stopBlitPlayback(): void {
    this._stopBlitLoop();
    this._playbackMode = 'normal';
    // Resume normal RAF loop
    this.requestRender();
  }

  private _blitTick(): void {
    if (this._playbackMode !== 'blit-only') {
      this._stopBlitLoop();
      return;
    }

    const frame = this._blitCurrentFrame;

    // Ask callback to blit this frame
    const ok = this._blitFrameCallback?.(frame) ?? false;

    if (!ok) {
      // Cache miss during playback — fall back to normal mode
      console.warn(`[RenderLoop] Blit cache miss at frame ${frame} — falling back to render mode`);
      this.stopBlitPlayback();
      this.onBlitEnd?.();
      return;
    }

    // Update FPS counter
    const now = performance.now();
    const deltaMs = now - this._blitLastTime;
    this._blitLastTime = now;
    this.fpsAccumulator += deltaMs;
    this.fpsFrames++;
    if (this.fpsAccumulator >= 500) {
      this._currentFps = Math.round((this.fpsFrames * 1000) / this.fpsAccumulator);
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }
    this.frameCount++;

    // Notify listeners
    const fps = this._targetFps > 0 ? this._targetFps : 30;
    this.onBlitFrame?.(frame, frame / fps);

    // Advance frame
    this._blitCurrentFrame++;
    if (this._blitCurrentFrame >= this._blitEndFrame) {
      if (this._blitLoop) {
        this._blitCurrentFrame = this._blitStartFrame;
      } else {
        this._stopBlitLoop();
        this._playbackMode = 'normal';
        this.onBlitEnd?.();
      }
    }
  }

  private _stopBlitLoop(): void {
    if (this._blitIntervalId !== null) {
      clearInterval(this._blitIntervalId);
      this._blitIntervalId = null;
    }
    if (this._playbackMode === 'blit-only') {
      this._playbackMode = 'normal';
    }
    this._blitFrameCallback = null;
  }

  // ── Normal RAF tick ─────────────────────────────────────────

  private tick = (now: number): void => {
    if (!this.running) return;

    // During blit-only mode, the RAF loop idles — setInterval drives playback
    if (this._playbackMode === 'blit-only') {
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    if (!this.needsRender) {
      if (!this.idleTimeout) {
        this.idleTimeout = setTimeout(() => {
          this._idlePaused = true;
          this.idleTimeout = null;
        }, VIEWPORT_CONFIG.IDLE_PAUSE_MS);
      }
      if (this._idlePaused) {
        this.animFrameId = null;
        return;
      }
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    const cap = this._interactive ? 0 : this._targetFps;
    if (cap > 0) {
      const minDelta = 1000 / cap;
      const sinceLast = now - this.lastRenderTime;
      if (sinceLast < minDelta - 1) {
        this.onFrameDropped?.();
        this.animFrameId = requestAnimationFrame(this.tick);
        return;
      }
    }

    this.needsRender = false;
    this.lastRenderTime = now;

    const deltaMs = now - this.lastTime;
    this.lastTime = now;
    this.frameCount++;

    this.fpsAccumulator += deltaMs;
    this.fpsFrames++;
    if (this.fpsAccumulator >= 500) {
      this._currentFps = Math.round((this.fpsFrames * 1000) / this.fpsAccumulator);
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }

    try {
      this.beforeRender?.();

      const canvas = this.renderer.domElement;
      const pr = this.renderer.getPixelRatio();
      this.renderer.setViewport(0, 0, canvas.width / pr, canvas.height / pr);
      this.renderer.setScissorTest(false);

      this.renderer.render(this.scene, this.camera);
      this.afterRender?.();
    } catch (err) {
      console.error('[RenderLoop] frame error:', err);
    }

    try {
      this._onFrame?.({
        deltaMs,
        fps: this._currentFps,
        frameCount: this.frameCount,
      });
    } catch (err) {
      console.error('[RenderLoop] onFrame error:', err);
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stop();
  }
}