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
import { NestedCompRenderer } from './compositing/NestedCompRenderer';
import { CompLayerRenderer } from './layers/CompLayerRenderer';
import { FrameCache } from './cache/FrameCache';
import { CacheInvalidator } from './cache/CacheInvalidator';
import { AdaptiveResolution } from './cache/AdaptiveResolution';
import { RenderScheduler } from './RenderScheduler';
import { useCompositionStore } from '../state/compositionStore';
import type { Composition } from '../types/composition';
import type { CompData } from '../types/layer';

export interface RendererState { fps: number; zoom: number; frameCount: number; quality?: string; ramCacheMB?: number; droppedFrames?: number; }

const MAX_NESTED_COMPS_PER_FRAME = 32;

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

  // Cache system
  public readonly frameCache: FrameCache;
  public readonly cacheInvalidator: CacheInvalidator;
  public readonly renderScheduler: RenderScheduler;
  public readonly adaptiveResolution: AdaptiveResolution;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;
  private _composition: Composition | null = null;

  /** Cached nested-comp renderers keyed by sourceCompId */
  private _nestedRenderers = new Map<string, NestedCompRenderer>();

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x3d3d3d, 1);
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
    this.selectionOverlay.mount();

    // Cache system
    this.frameCache = new FrameCache();
    this.adaptiveResolution = new AdaptiveResolution();
    this.renderScheduler = new RenderScheduler();
    this.renderScheduler.setAdaptiveResolution(this.adaptiveResolution);
    this.cacheInvalidator = new CacheInvalidator(this.frameCache);

    this.renderLoop = new RenderLoop(this.renderer, this.sceneManager.scene, this.cameraManager.camera);
    this.resizeHandler = new ResizeHandler(this.renderer, this.cameraManager, this.renderLoop);
    this.cameraManager.onChanged = () => this.renderLoop.requestRender();

    this.renderLoop.beforeRender = () => {
      this._updateLayerFrameVisibility();
      this._processNestedComps();
      this._processEffects();
    };

    this.renderLoop.onFrame = (stats: FrameStats) => {
      const vp = this.cameraManager.getViewportTransform();
      const budget = this.renderScheduler.getBudget();
      const ramMB = Math.round(this.frameCache.getMemoryUsage() / (1024 * 1024));
      this._state = {
        fps: stats.fps,
        zoom: vp.zoom,
        frameCount: stats.frameCount,
        quality: budget.quality,
        ramCacheMB: ramMB,
        droppedFrames: budget.droppedFrames,
      };
      this._onStateChange?.(this._state);
    };

    this.resizeHandler.observe(container);
    this.renderLoop.start();
    this.cacheInvalidator.activate();

    // Wire adaptive resolution quality changes → request render
    this.adaptiveResolution.onQualityChange = () => this.renderLoop.requestRender();
  }

  applyComposition(comp: Composition): void {
    const prev = this._composition;
    const changedSize = !prev
      || prev.width !== comp.width
      || prev.height !== comp.height;
    const changedBg = !prev
      || prev.backgroundColor !== comp.backgroundColor;

    this._composition = comp;

    if (changedSize || changedBg) {
      this.sceneManager.applyComposition(comp.width, comp.height, comp.backgroundColor);
    }
    if (changedSize) {
      this.cameraManager.setCompositionSize(comp.width, comp.height);
    }

    this.renderLoop.requestRender();
  }

  get composition(): Composition | null { return this._composition; }

  /** Get the cached frame at the given frame number for the active comp */
  getCachedFrame(compId: string, frame: number): ImageBitmap | null {
    const cached = this.frameCache.get(compId, frame);
    return cached?.imageBitmap ?? null;
  }

  /** Check if a frame is cached at the minimum quality level */
  isFrameCached(compId: string, frame: number, minQuality?: 'full' | 'half' | 'quarter'): boolean {
    return this.frameCache.has(compId, frame, minQuality);
  }

  setGridVisible(v: boolean): void { v ? this.sceneManager.grid.show() : this.sceneManager.grid.hide(); this.renderLoop.requestRender(); }
  setSafeZonesVisible(v: boolean): void { v ? this.sceneManager.safeZones.show() : this.sceneManager.safeZones.hide(); this.renderLoop.requestRender(); }
  setSnappingEnabled(enabled: boolean): void { this.snapping.enabled = enabled; }
  getState(): RendererState { return { ...this._state }; }
  set onStateChange(cb: ((state: RendererState) => void) | undefined) { this._onStateChange = cb; }

  private _updateLayerFrameVisibility(): void {
    const state = useCompositionStore.getState();
    const comp = state.activeCompositionId
      ? state.compositions.find(c => c.id === state.activeCompositionId)
      : null;
    if (!comp) return;
    const currentFrame = Math.floor(comp.currentTime * comp.fps);
    this.layerSync.updateFrameVisibility(currentFrame);
  }

  /** Render all nested compositions to their offscreen textures BEFORE the main scene renders */
  private _processNestedComps(): void {
    const state = useCompositionStore.getState();
    const activeComp = state.activeCompositionId
      ? state.compositions.find(c => c.id === state.activeCompositionId)
      : null;
    if (!activeComp) return;

    const parentFrame = Math.floor(activeComp.currentTime * activeComp.fps);
    const compLayers = activeComp.layers.filter(l => l.type === 'comp' && l.data);
    if (compLayers.length === 0) {
      this._garbageCollectNestedRenderers(new Set());
      return;
    }

    const activeSourceIds = new Set<string>();
    let renderedCount = 0;

    for (const layer of compLayers) {
      if (renderedCount >= MAX_NESTED_COMPS_PER_FRAME) {
        console.warn('[Renderer] Nested comp cap hit at', MAX_NESTED_COMPS_PER_FRAME);
        break;
      }
      const inRange = parentFrame >= layer.startFrame && parentFrame <= layer.endFrame;
      if (!layer.visible || !inRange) continue;

      const data = layer.data as CompData;
      const source = state.compositions.find(c => c.id === data.sourceCompId);
      if (!source) continue;

      activeSourceIds.add(source.id);

      // Get or create nested renderer
      let nested = this._nestedRenderers.get(source.id);
      if (!nested) {
        nested = new NestedCompRenderer(this.renderer, source);
        this._nestedRenderers.set(source.id, nested);
      }

      // Sync source layers into nested scene
      nested.syncLayers(source.layers);

      // Compute local frame and update visibility for nested layers
      const nestedTotalFrames = Math.floor(source.duration * source.fps);
      const localFrame = NestedCompRenderer.computeLocalFrame(
        parentFrame, layer.startFrame, source.fps, activeComp.fps,
        data, nestedTotalFrames,
      );
      nested.updateFrameVisibility(Math.floor(localFrame), source.layers);

      // Render nested scene to texture
      nested.render();
      renderedCount++;

      // Wire the texture into the parent CompLayerRenderer
      const parentRenderer = this.layerSync.getRenderer(layer.id);
      if (parentRenderer instanceof CompLayerRenderer) {
        parentRenderer.setTexture(nested.texture);
        parentRenderer.setSize(source.width, source.height);
      }
    }

    this._garbageCollectNestedRenderers(activeSourceIds);
  }

  /** Dispose nested renderers no longer needed */
  private _garbageCollectNestedRenderers(activeIds: Set<string>): void {
    for (const [id, r] of this._nestedRenderers) {
      if (!activeIds.has(id)) {
        r.dispose();
        this._nestedRenderers.delete(id);
      }
    }
  }

  private _processEffects(): void {
    const layerIds: string[] = [];
    for (const child of this.sceneManager.layerGroup.children) {
      const renderer = this.layerSync.getRenderer(child.name);
      if (renderer) {
        layerIds.push(renderer.id);
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
        this.effectsRenderer.renderLayer(renderer.id, renderer.mesh, gn, gh, renderer.group);
      }
    }
  }

  private _toggleOriginalMesh(layerRenderer: { mesh: THREE.Mesh; group: THREE.Group }, visible: boolean): void {
    if (layerRenderer.mesh.visible === visible) return;
    layerRenderer.mesh.visible = visible;
  }

  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }

  dispose(): void {
    this.renderLoop.dispose();
    this.resizeHandler.dispose();
    for (const r of this._nestedRenderers.values()) r.dispose();
    this._nestedRenderers.clear();
    this.sceneManager.dispose();
    this.cameraManager.dispose();
    this.layerSync.clear();
    this.effectsRenderer.dispose();
    this.selectionOverlay.dispose();
    this.cacheInvalidator.dispose();
    this.renderScheduler.dispose();
    this.adaptiveResolution.dispose();
    this.frameCache.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}