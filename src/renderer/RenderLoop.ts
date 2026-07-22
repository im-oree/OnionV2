/**
 * RenderLoop â€” manages the requestAnimationFrame render cycle.
 */
import * as THREE from 'three';
import { VIEWPORT_CONFIG } from '../config/viewportConfig';

export interface FrameStats {
  deltaMs: number;
  fps: number;
  frameCount: number;
}

export class RenderLoop {
  private renderer: THREE.WebGLRenderer;
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

  private _pausedForCacheBuild = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  public beforeRender: (() => void) | null = null;
  public afterRender: (() => void) | null = null;
  public onFrameDropped: (() => void) | null = null;

  set onFrame(cb: ((stats: FrameStats) => void) | undefined) {
    this._onFrame = cb;
  }

  setTargetFps(fps: number): void {
    this._targetFps = Math.max(0, fps);
  }

  setInteractive(v: boolean): void {
    this._interactive = v;
    this.requestRender();
  }

  requestRender(): void {
    if (this._pausedForCacheBuild) return;
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
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  pauseForCacheBuild(): void {
    this._pausedForCacheBuild = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  resumeFromCacheBuild(): void {
    if (!this._pausedForCacheBuild) return;
    this._pausedForCacheBuild = false;
    if (this.running) {
      this.needsRender = true;
      this.lastTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  getCamera(): THREE.Camera { return this.camera; }
  get isPausedForCacheBuild(): boolean { return this._pausedForCacheBuild; }
  get isRunning(): boolean { return this.running; }
  get currentFps(): number { return this._currentFps; }
  get idlePaused(): boolean { return this._idlePaused; }
  get targetFps(): number { return this._targetFps; }

  private tick = (now: number): void => {
    if (!this.running) return;
    if (this._pausedForCacheBuild) {
      this.animFrameId = null;
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

      // FORCE correct viewport right before scene render
      const canvas = this.renderer.domElement;
      const pr = this.renderer.getPixelRatio();
      this.renderer.setViewport(0, 0, canvas.width / pr, canvas.height / pr);
      this.renderer.setScissorTest(false);

      this.renderer.render(this.scene, this.camera);
      this.afterRender?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RenderLoop] frame error:', err);
    }

    try {
      this._onFrame?.({
        deltaMs,
        fps: this._currentFps,
        frameCount: this.frameCount,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RenderLoop] onFrame error:', err);
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stop();
  }
}