/**
 * RenderLoop — manages the requestAnimationFrame render cycle.
 * Tracks frame time and can pause/resume.
 * IDLE PAUSE: pauses the loop after 500ms of no render requests to save CPU/GPU.
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
  private frameCount = 0;
  private fpsAccumulator = 0;
  private fpsFrames = 0;
  private _currentFps = 0;
  private running = false;
  private _onFrame?: (stats: FrameStats) => void;

  // Idle pause
  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private needsRender = false;
  private _idlePaused = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /** Optional callback fired BEFORE each frame render (for effects processing) */
  public beforeRender: (() => void) | null = null;

  /** Optional callback fired each frame with stats */
  set onFrame(cb: ((stats: FrameStats) => void) | undefined) {
    this._onFrame = cb;
  }

  /** Request a render. Wakes up the loop if idle-paused. */
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

  /** Start the render loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    this._idlePaused = false;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  /** Stop the render loop */
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

  /** Single render call (for manual stepping) */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  get isRunning(): boolean {
    return this.running;
  }

  get currentFps(): number {
    return this._currentFps;
  }

  get idlePaused(): boolean {
    return this._idlePaused;
  }

  /** The main tick function */
  private tick = (now: number): void => {
    if (!this.running) return;

    // Check if we should enter idle pause
    if (!this.needsRender) {
      if (!this.idleTimeout) {
        this.idleTimeout = setTimeout(() => {
          this._idlePaused = true;
          this.idleTimeout = null;
          // Don't cancel the anim frame — just stop scheduling new ones
        }, VIEWPORT_CONFIG.IDLE_PAUSE_MS);
      }

      // If idle-paused, leave the animFrameId as-is but don't schedule next frame
      if (this._idlePaused) {
        this.animFrameId = null;
        return;
      }
    }

    this.needsRender = false;

    const deltaMs = now - this.lastTime;
    this.lastTime = now;
    this.frameCount++;

    // Update FPS averaging
    this.fpsAccumulator += deltaMs;
    this.fpsFrames++;
    if (this.fpsAccumulator >= 1000) {
      this._currentFps = Math.round((this.fpsFrames * 1000) / this.fpsAccumulator);
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }

    // Fire before-render callback (effects processing, etc.)
    this.beforeRender?.();

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Fire frame callback
    this._onFrame?.({
      deltaMs,
      fps: this._currentFps,
      frameCount: this.frameCount,
    });

    // Schedule next frame
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stop();
  }
}
