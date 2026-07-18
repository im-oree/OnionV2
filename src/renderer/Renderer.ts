import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CameraManager } from './CameraManager';
import { RenderLoop, type FrameStats } from './RenderLoop';
import { ResizeHandler } from './ResizeHandler';
import { Snapping } from './utils/Snapping';
import { LayerSync } from './sync/LayerSync';
import { HitTester } from './interaction/HitTest';
import { SelectionOverlay } from './interaction/SelectionOverlay';
import { ModalTransform } from './interaction/ModalTransform';
import { EffectsRenderer } from './effects/EffectsRenderer';
import type { Composition } from '../types/composition';

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
  public readonly snapping: Snapping;
  public readonly layerSync: LayerSync;
  public readonly hitTester: HitTester;
  public readonly selectionOverlay: SelectionOverlay;
  public readonly modalTransform: ModalTransform;
  public readonly effectsRenderer: EffectsRenderer;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;
  private _composition: Composition | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a1a1a, 1);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.sceneManager = new SceneManager();
    this.cameraManager = new CameraManager();
    this.snapping = new Snapping();
    this.layerSync = new LayerSync(this.sceneManager);
    this.hitTester = new HitTester(this.sceneManager, this.cameraManager);
    this.selectionOverlay = new SelectionOverlay(container, this.cameraManager);
    this.modalTransform = new ModalTransform(this.cameraManager);
    this.effectsRenderer = new EffectsRenderer(this.renderer);

    // Mount the selection overlay SVG
    this.selectionOverlay.mount();

    this.renderLoop = new RenderLoop(
      this.renderer, this.sceneManager.scene, this.cameraManager.camera,
    );

    this.resizeHandler = new ResizeHandler(this.renderer, this.cameraManager, this.renderLoop);

    // Wire CameraManager changes to trigger real-time viewport updates (M1)
    this.cameraManager.onChanged = () => this.renderLoop.requestRender();

    // Wire EffectsRenderer into the pre-render pipeline
    this.renderLoop.beforeRender = () => this._processEffects();

    this.renderLoop.onFrame = (stats: FrameStats) => {
      const vp = this.cameraManager.getViewportTransform();
      this._state = { fps: stats.fps, zoom: vp.zoom, frameCount: stats.frameCount };
      this._onStateChange?.(this._state);
    };

    this.resizeHandler.observe(container);
    this.renderLoop.start();
  }

  applyComposition(comp: Composition): void {
    this._composition = comp;
    this.sceneManager.applyComposition(comp.width, comp.height, comp.backgroundColor);
    this.cameraManager.setCompositionSize(comp.width, comp.height);
    // K3: Don't auto-fit camera to composition. Let user control zoom/pan.
    // this.cameraManager.fitToComposition();
    // Layer sync is handled by the dedicated layerSync effect in useRenderer
    // — don't sync here to avoid double-sync conflicts.
    this.renderLoop.requestRender();
  }

  get composition(): Composition | null { return this._composition; }

  setGridVisible(visible: boolean): void {
    if (visible) this.sceneManager.grid.show();
    else this.sceneManager.grid.hide();
    this.renderLoop.requestRender();
  }

  setSafeZonesVisible(visible: boolean): void {
    if (visible) this.sceneManager.safeZones.show();
    else this.sceneManager.safeZones.hide();
    this.renderLoop.requestRender();
  }

  setSnappingEnabled(enabled: boolean): void {
    this.snapping.enabled = enabled;
  }

  getState(): RendererState { return { ...this._state }; }

  set onStateChange(cb: ((state: RendererState) => void) | undefined) {
    this._onStateChange = cb;
  }

  /** Process effects for all layers before each frame render */
  private _processEffects(): void {
    const layerIds: string[] = [];
    for (const child of this.sceneManager.layerGroup.children) {
      const renderer = this.layerSync.getRenderer(child.name);
      if (renderer) {
        layerIds.push(renderer.id);
        // Hide original mesh if effects are active (effect quad replaces it)
        const hasFx = this.effectsRenderer.hasEffects(renderer.id);
        this._toggleOriginalMesh(renderer, !hasFx);
      }
    }
    this.effectsRenderer.prepareFrame(layerIds);

    for (const child of this.sceneManager.layerGroup.children) {
      const renderer = this.layerSync.getRenderer(child.name);
      if (renderer && this.effectsRenderer.hasEffects(renderer.id)) {
        const gn = (renderer as any).geometryWidth();
        const gh = (renderer as any).geometryHeight();
        this.effectsRenderer.renderLayer(
          renderer.id, renderer.mesh, gn, gh,
          renderer.group,
        );
      }
    }
  }

  /** Toggle original mesh visibility (hide when effects active) */
  private _toggleOriginalMesh(layerRenderer: { mesh: THREE.Mesh; group: THREE.Group }, visible: boolean): void {
    if (layerRenderer.mesh.visible === visible) return;
    layerRenderer.mesh.visible = visible;
  }

  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }

  dispose(): void {
    this.renderLoop.dispose();
    this.resizeHandler.dispose();
    this.sceneManager.dispose();
    this.cameraManager.dispose();
    this.layerSync.clear();
    this.effectsRenderer.dispose();
    this.selectionOverlay.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
