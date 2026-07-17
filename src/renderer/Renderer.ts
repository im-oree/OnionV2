/**
 * Renderer — main class that wires all rendering subsystems together.
 * Creates the WebGLRenderer, manages scene/camera/loop/lifecycle.
 */
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CameraManager } from './CameraManager';
import { RenderLoop, type FrameStats } from './RenderLoop';
import { ResizeHandler } from './ResizeHandler';
import type { Composition } from '../types/composition';

export interface RendererOptions {
  /** Parent DOM element to attach the canvas to */
  container: HTMLElement;
  /** Optional initial composition to render */
  composition?: Composition;
  /** Whether to start the render loop immediately */
  autoStart?: boolean;
}

export interface RendererState {
  fps: number;
  zoom: number;
  frameCount: number;
}

export class Renderer {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly sceneManager: SceneManager;
  public readonly cameraManager: CameraManager;
  public readonly renderLoop: RenderLoop;
  public readonly resizeHandler: ResizeHandler;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;

  constructor(options: RendererOptions) {
    const { container, composition, autoStart = true } = options;

    // Create WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setClearColor(0x1a1a1a, 1);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    // Append canvas to container before initializing size
    container.appendChild(this.renderer.domElement);

    // Create subsystems
    this.sceneManager = new SceneManager();
    this.cameraManager = new CameraManager();
    this.renderLoop = new RenderLoop(this.renderer, this.sceneManager.scene, this.cameraManager.camera);
    this.resizeHandler = new ResizeHandler(this.renderer, this.cameraManager);

    // Set up frame callback to update state
    this.renderLoop.onFrame = (stats: FrameStats) => {
      const vp = this.cameraManager.getViewportTransform();
      this._state = {
        fps: stats.fps,
        zoom: vp.zoom,
        frameCount: stats.frameCount,
      };
      this._onStateChange?.(this._state);
    };

    // Start observing resize
    this.resizeHandler.observe(container);

    // Apply initial composition if provided
    if (composition) {
      this.applyComposition(composition);
    }

    // Start render loop
    if (autoStart) {
      this.renderLoop.start();
    }
  }

  /** Apply a composition to the scene */
  applyComposition(comp: Composition): void {
    this.sceneManager.applyComposition(comp);
    this.cameraManager.setCompositionSize(comp.width, comp.height);
    this.cameraManager.zoomToFit();
  }

  /** Get current renderer state for UI display */
  getState(): RendererState {
    return { ...this._state };
  }

  /** Subscribe to state changes (for React hook integration) */
  set onStateChange(cb: ((state: RendererState) => void) | undefined) {
    this._onStateChange = cb;
  }

  /** Get the canvas DOM element */
  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Dispose of all resources */
  dispose(): void {
    this.renderLoop.dispose();
    this.resizeHandler.dispose();
    this.sceneManager.dispose();
    this.cameraManager.dispose();
    this.renderer.dispose();

    // Remove canvas from DOM
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
