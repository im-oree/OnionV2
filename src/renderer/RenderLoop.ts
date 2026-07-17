/**
 * RenderLoop — manages the requestAnimationFrame render cycle.
 * Tracks frame time and can pause/resume.
 */
import * as THREE from 'three';

export interface FrameStats {
  /** Time since last frame in ms */
  deltaMs: number;
  /** Current FPS */
  fps: number;
  /** Total frames rendered */
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

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /** Optional callback fired each frame with stats */
  set onFrame(cb: ((stats: FrameStats) => void) | undefined) {
    this._onFrame = cb;
  }

  /** Start the render loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  /** Stop the render loop */
  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /** Single render call (for manual stepping) */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Check if the loop is running */
  get isRunning(): boolean {
    return this.running;
  }

  /** Get current smoothed FPS */
  get currentFps(): number {
    return this._currentFps;
  }

  /** The main tick function */
  private tick = (now: number): void => {
    if (!this.running) return;

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

  /** Dispose the loop */
  dispose(): void {
    this.stop();
  }
}
