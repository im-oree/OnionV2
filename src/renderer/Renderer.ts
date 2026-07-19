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
import { FrameCache, type CacheQuality } from './cache/FrameCache';
import { CacheInvalidator } from './cache/CacheInvalidator';
import { AdaptiveResolution } from './cache/AdaptiveResolution';
import { RAMPreviewBuilder } from './cache/RAMPreviewBuilder';
import { FrameDiskCache } from './cache/FrameDiskCache';
import { GPUTextureCache } from './cache/GPUTextureCache';
import { RenderScheduler } from './RenderScheduler';
import { PerfMonitor } from './monitoring/PerfMonitor';
import { resourceRegistry } from './utils/ResourceRegistry';
import { PropertyBinder } from '../animation/PropertyBinder';
import { useKeyframeStore } from '../state/keyframeStore';
import { useCompositionStore } from '../state/compositionStore';
import { useTimelineStore } from '../state/timelineStore';
import { useToolStore } from '../state/toolStore';
import { TOOLS } from '../config/constants';
import type { Composition } from '../types/composition';
import type { CompData } from '../types/layer';

export interface RendererState {
  fps: number;
  zoom: number;
  frameCount: number;
  quality?: string;
  ramCacheMB?: number;
  droppedFrames?: number;
}

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

  public readonly frameCache: FrameCache;
  public readonly cacheInvalidator: CacheInvalidator;
  public readonly renderScheduler: RenderScheduler;
  public readonly adaptiveResolution: AdaptiveResolution;
  public readonly ramPreviewBuilder: RAMPreviewBuilder;
  public readonly perfMonitor: PerfMonitor;
  public readonly frameDiskCache: FrameDiskCache;
  public readonly gpuTextureCache: GPUTextureCache;
  public readonly propertyBinder: PropertyBinder;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;
  private _composition: Composition | null = null;
  private _captureCanvas: HTMLCanvasElement | null = null;
  private _interactiveHandler: ((e: Event) => void) | null = null;
  private _toolUnsubscribe: (() => void) | null = null;
  private _kfUnsub: (() => void) | null = null;

  /** Cache render time override. null = use store's currentTime. */
  private _cacheRenderTimeOverride: number | null = null;

  /** Track last displayed cached frame to avoid re-uploading identical textures */
  private _lastCachedFrameNum = -1;
  private _lastCachedCompId = '';

  private _nestedRenderers = new Map<string, NestedCompRenderer>();

  private _cachedFrameQuad: THREE.Mesh | null = null;
  private _cachedFrameTex: THREE.CanvasTexture | null = null;
  private _cachedFrameCanvas: HTMLCanvasElement | null = null;
  private _cachedFrameCtx: CanvasRenderingContext2D | null = null;

  private _activityHandler: (() => void) | null = null;
  private _loadDiskCacheOnReady: ((compId: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // needed for readPixels reliability
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
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

    this.frameCache = new FrameCache();
    this.adaptiveResolution = new AdaptiveResolution();
    this.renderScheduler = new RenderScheduler();
    this.renderScheduler.setAdaptiveResolution(this.adaptiveResolution);
    this.renderScheduler.onRequestRender = () => this.renderLoop.requestRender();

    this.cacheInvalidator = new CacheInvalidator(this.frameCache);
    this.cacheInvalidator.onInvalidateAll = (compId) => {
      this.gpuTextureCache.invalidateAll(compId);
    };
    this.ramPreviewBuilder = new RAMPreviewBuilder(this.frameCache);
    this.ramPreviewBuilder.setRendererRef(() => this);
    this.frameDiskCache = new FrameDiskCache(this.frameCache);
    this.gpuTextureCache = new GPUTextureCache();
    this.propertyBinder = new PropertyBinder(useKeyframeStore.getState().engine);

    let _lastKfRevision = useKeyframeStore.getState().revision;
    this._kfUnsub = useKeyframeStore.subscribe((state) => {
      if (state.revision === _lastKfRevision) return;
      _lastKfRevision = state.revision;
      this.renderLoop.requestRender();
    });

    this.perfMonitor = new PerfMonitor();
    this.perfMonitor.setFrameCache(this.frameCache);

    (window as any).__frameCache = this.frameCache;
    (window as any).__ramPreviewBuilder = this.ramPreviewBuilder;
    (window as any).__frameDiskCache = this.frameDiskCache;
    (window as any).__adaptiveResolution = this.adaptiveResolution;
    (window as any).__perfMonitor = this.perfMonitor;
    (window as any).__resourceRegistry = resourceRegistry;
    (window as any).__renderer = this;

    this.renderLoop = new RenderLoop(
      this.renderer,
      this.sceneManager.scene,
      this.cameraManager.camera,
    );
    this.resizeHandler = new ResizeHandler(
      this.renderer,
      this.cameraManager,
      this.renderLoop,
    );
    this.cameraManager.onChanged = () => this.renderScheduler.request('interactive');

    this._interactiveHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.renderLoop.setInteractive(!!detail?.on);
    };
    document.addEventListener('renderer:interactive', this._interactiveHandler);

    this.renderLoop.onFrameDropped = () => {
      this.renderScheduler.recordDroppedFrame();
      this.perfMonitor.recordDroppedFrame();
    };

    const reportActivity = () => {
      if (!useTimelineStore.getState().autoCache) {
        this.ramPreviewBuilder.cancelIdleCaching();
        return;
      }
      this.ramPreviewBuilder.reportActivity();
    };
    document.addEventListener('mousedown', reportActivity, { passive: true });
    document.addEventListener('mousemove', reportActivity, { passive: true });
    document.addEventListener('keydown', reportActivity, { passive: true });
    document.addEventListener('wheel', reportActivity, { passive: true });
    this._activityHandler = reportActivity;

    this._loadDiskCacheOnReady = (compId: string) => {
      this.frameDiskCache
        .loadIntoCache(compId)
        .then((count) => {
          if (count > 0) {
            console.log(`[Cache] Loaded ${count} frames from disk cache`);
            this.renderLoop.requestRender();
          }
        })
        .catch(() => {});
    };

    let renderStart = 0;
    this.renderLoop.beforeRender = () => {
      renderStart = performance.now();

      const cs = useCompositionStore.getState();
      const comp = cs.activeCompositionId
        ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
        : null;
      if (!comp) return;

      const effectiveTime =
        this._cacheRenderTimeOverride !== null
          ? this._cacheRenderTimeOverride
          : comp.currentTime;
      const frame = Math.floor(effectiveTime * comp.fps);

      const isInCacheBuild = this._cacheRenderTimeOverride !== null;

      // GPU-accelerated cached frame display — use GPU texture (fast path)
      // or fall back to ImageBitmap → CanvasTexture.
      if (!isInCacheBuild && !ModalTransform.activeAnywhere) {
        const gpuTex = this.gpuTextureCache.get(comp.id, frame);
        if (gpuTex) {
          this._displayCachedFrameGPU(gpuTex, comp.id, frame);
          this.perfMonitor.recordCacheAccess(true);
          return;
        }
        const cached = this.frameCache.get(comp.id, frame);
        if (cached?.imageBitmap) {
          this._displayCachedFrame(cached.imageBitmap, comp.id, frame);
          this.perfMonitor.recordCacheAccess(true);
          return;
        }
      }

      this._hideCachedFrameDisplay();
      this.perfMonitor.recordCacheAccess(false);
      this._lastCachedFrameNum = -1;

      const totalKf = this.propertyBinder.engine.totalKeyframes;
      if (totalKf > 0 && !ModalTransform.activeAnywhere) {
        const count = this.propertyBinder.evaluateFrame(comp.id, frame);
        if (count > 0 && this.propertyBinder.hasOverrides) {
          this.layerSync.setRuntimeOverridesActive(true);
          this.layerSync.applyRuntimeOverrides(this.propertyBinder.overrides);
        }
      }

      this.layerSync.updateFrameVisibility(frame);
      this._processNestedComps(comp);
      this._processEffects();
    };

    this.renderLoop.onFrame = (stats: FrameStats) => {
      const vp = this.cameraManager.getViewportTransform();
      const budget = this.renderScheduler.getBudget();
      const ramMB = Math.round(this.frameCache.getMemoryUsage() / (1024 * 1024));

      const renderTime = renderStart > 0 ? performance.now() - renderStart : 0;
      if (renderTime > 0) {
        this.renderScheduler.didRender(renderTime);
        this.perfMonitor.recordFrameTime(renderTime);
      }

      this.layerSync.setRuntimeOverridesActive(false);

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

    // NOTE: adaptiveResolution.onQualityChange no longer resizes the canvas.
    // Adaptive quality now purely informs cache tagging; live rendering
    // stays at the CSS layout resolution. This prevents mid-build resizes.
    this.adaptiveResolution.onQualityChange = () => {
      // no-op — kept for future work if we want quality-scaled live renders
    };

    const updateGizmo = (tool: string) => {
      if (tool === TOOLS.MOVE) this.selectionOverlay.gizmoMode = 'move';
      else if (tool === TOOLS.ROTATE) this.selectionOverlay.gizmoMode = 'rotate';
      else if (tool === TOOLS.SCALE) this.selectionOverlay.gizmoMode = 'scale';
      else this.selectionOverlay.gizmoMode = null;
      this.renderLoop.requestRender();
    };
    this._toolUnsubscribe = useToolStore.subscribe((state) =>
      updateGizmo(state.activeTool),
    );
    updateGizmo(useToolStore.getState().activeTool);

    this.renderLoop.requestRender();
  }

  // ── Cache render time API ─────────────────────────────────────

  setCacheRenderTime(timeSeconds: number): void {
    this._cacheRenderTimeOverride = timeSeconds;
  }
  clearCacheRenderTime(): void {
    this._cacheRenderTimeOverride = null;
  }

  // ── Composition ───────────────────────────────────────────────

  applyComposition(comp: Composition): void {
    const prev = this._composition;
    const changedSize =
      !prev || prev.width !== comp.width || prev.height !== comp.height;

    // Clean up GPU textures from the previous composition
    if (prev && prev.id !== comp.id) {
      this.gpuTextureCache.invalidateAll(prev.id);
    }

    this._composition = comp;

    this.sceneManager.applyComposition(comp.width, comp.height, comp.backgroundColor);

    if (changedSize) {
      this.cameraManager.setCompositionSize(comp.width, comp.height);
    }

    this.renderLoop.setTargetFps(comp.fps);
    this.renderScheduler.setFrameBudget(comp.fps);
    this.adaptiveResolution.setTargetFps(comp.fps);
    this.perfMonitor.setTargetFps(comp.fps);
    this.perfMonitor.setCacheBudget(this.frameCache.maxBytes);

    this.renderLoop.render();
    this.renderLoop.requestRender();

    this._loadDiskCacheOnReady?.(comp.id);
  }

  get composition(): Composition | null { return this._composition; }

  getCachedFrame(compId: string, frame: number): ImageBitmap | null {
    return this.frameCache.get(compId, frame)?.imageBitmap ?? null;
  }
  isFrameCached(compId: string, frame: number, minQuality?: CacheQuality): boolean {
    return this.frameCache.has(compId, frame, minQuality);
  }

  setGridVisible(v: boolean): void {
    v ? this.sceneManager.grid.show() : this.sceneManager.grid.hide();
    this.renderLoop.requestRender();
  }
  setSafeZonesVisible(v: boolean): void {
    v ? this.sceneManager.safeZones.show() : this.sceneManager.safeZones.hide();
    this.renderLoop.requestRender();
  }
  setSnappingEnabled(enabled: boolean): void { this.snapping.enabled = enabled; }
  getState(): RendererState { return { ...this._state }; }
  set onStateChange(cb: ((state: RendererState) => void) | undefined) {
    this._onStateChange = cb;
  }

  // ── Before-render helpers ─────────────────────────────────────

  private _processNestedComps(comp: Composition): void {
    const state = useCompositionStore.getState();
    const parentFrame = Math.floor(
      (this._cacheRenderTimeOverride ?? comp.currentTime) * comp.fps,
    );

    const compLayers = comp.layers.filter((l) => l.type === 'comp' && l.data);
    if (compLayers.length === 0) {
      this._garbageCollectNestedRenderers(new Set());
      return;
    }

    const activeSourceIds = new Set<string>();
    let renderedCount = 0;

    for (const layer of compLayers) {
      if (renderedCount >= MAX_NESTED_COMPS_PER_FRAME) break;
      const inRange = parentFrame >= layer.startFrame && parentFrame <= layer.endFrame;
      if (!layer.visible || !inRange) continue;

      const data = layer.data as CompData;
      const source = state.compositions.find((c) => c.id === data.sourceCompId);
      if (!source) continue;

      activeSourceIds.add(source.id);

      let nested = this._nestedRenderers.get(source.id);
      if (!nested) {
        nested = new NestedCompRenderer(this.renderer, source);
        this._nestedRenderers.set(source.id, nested);
      }

      nested.syncLayers(source.layers);
      const nestedTotalFrames = Math.floor(source.duration * source.fps);
      const localFrame = NestedCompRenderer.computeLocalFrame(
        parentFrame,
        layer.startFrame,
        source.fps,
        comp.fps,
        data,
        nestedTotalFrames,
      );
      nested.updateFrameVisibility(Math.floor(localFrame), source.layers);
      nested.render();
      renderedCount++;

      const parentRenderer = this.layerSync.getRenderer(layer.id);
      if (parentRenderer instanceof CompLayerRenderer) {
        parentRenderer.setTexture(nested.texture);
        parentRenderer.setSize(source.width, source.height);
      }
    }

    this._garbageCollectNestedRenderers(activeSourceIds);
  }

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
      const r = this.layerSync.getRenderer(child.name);
      if (r) {
        layerIds.push(r.id);
        this._toggleOriginalMesh(r, !this.effectsRenderer.hasEffects(r.id));
      }
    }
    this.effectsRenderer.prepareFrame(layerIds);
    for (const child of this.sceneManager.layerGroup.children) {
      const r = this.layerSync.getRenderer(child.name);
      if (r && this.effectsRenderer.hasEffects(r.id)) {
        const gw = (r as any).geometryWidth?.() ?? 0;
        const gh = (r as any).geometryHeight?.() ?? 0;
        this.effectsRenderer.renderLayer(r.id, r.mesh, gw, gh, r.group);
      }
    }
  }

  private _toggleOriginalMesh(
    lr: { mesh: THREE.Mesh; group: THREE.Group },
    visible: boolean,
  ): void {
    if (lr.mesh.visible !== visible) lr.mesh.visible = visible;
  }

  // ── RAM preview builder API ───────────────────────────────────

  /** Called by RAMPreviewBuilder BEFORE renderSynchronous(). */
  runBeforeRenderHooks(): void {
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
      : null;
    if (!comp) return;

    const effectiveTime =
      this._cacheRenderTimeOverride !== null
        ? this._cacheRenderTimeOverride
        : comp.currentTime;
    const frame = Math.floor(effectiveTime * comp.fps);

    const totalKf = this.propertyBinder.engine.totalKeyframes;
    if (totalKf > 0) {
      const count = this.propertyBinder.evaluateFrame(comp.id, frame);
      if (count > 0 && this.propertyBinder.hasOverrides) {
        this.layerSync.setRuntimeOverridesActive(true);
        this.layerSync.applyRuntimeOverrides(this.propertyBinder.overrides);
      }
    }
    // Ensure cached-frame quad is HIDDEN and 3D layers are VISIBLE
    // (in case we were showing a cached frame before this build started)
    this._hideCachedFrameDisplay();

    this.layerSync.updateFrameVisibility(frame);
    this._processNestedComps(comp);
    this._processEffects();
    this.layerSync.setRuntimeOverridesActive(false);
  }

  /** Forcefully restore scene to live-render state — used after cache build completes. */
  restoreLiveDisplay(): void {
    this._hideCachedFrameDisplay();
    this._lastCachedFrameNum = -1;
    this._lastCachedCompId = '';
    this.clearCacheRenderTime();
  }

  renderSynchronous(): void {
    this.renderer.render(this.sceneManager.scene, this.cameraManager.camera);
  }

  /**
   * Capture WebGL framebuffer → GPU texture cache + ImageBitmap fallback.
   * The GPU texture path (copyFramebufferToTexture) is a single GPU-side
   * copy with zero CPU round-trip, used for instant display during
   * scrubbing / playback.
   *
   * The ImageBitmap path (readPixels → OffscreenCanvas) is kept for
   * disk caching and as a fallback when GL context is unavailable.
   *
   * Assumes gl.finish() was called by the caller (RAMPreviewBuilder does
   * this) so readPixels has valid data.
   */
  captureFrame(compId: string, frame: number, quality: CacheQuality): void {
    const w = this.renderer.domElement.width;
    const h = this.renderer.domElement.height;
    if (w === 0 || h === 0) {
      console.warn('[captureFrame] Zero-size canvas — skipping');
      return;
    }

    // ── GPU texture cache (fast path, no CPU round-trip) ──
    try {
      this.gpuTextureCache.capture(this.renderer, w, h, compId, frame);
    } catch (err) {
      console.warn('[captureFrame] GPU texture capture failed:', err);
    }

    // ── ImageBitmap cache (for disk storage & fallback) ──
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      if (
        typeof OffscreenCanvas !== 'undefined' &&
        typeof (OffscreenCanvas.prototype as any).transferToImageBitmap === 'function'
      ) {
        const oc = new OffscreenCanvas(w, h);
        const octx = oc.getContext('2d')!;
        const imgData = octx.createImageData(w, h);
        const rowBytes = w * 4;
        for (let y = 0; y < h; y++) {
          const src = y * rowBytes;
          const dst = (h - 1 - y) * rowBytes;
          imgData.data.set(pixels.subarray(src, src + rowBytes), dst);
        }
        octx.putImageData(imgData, 0, 0);
        const bitmap = oc.transferToImageBitmap();
        this.frameCache.store(compId, frame, bitmap, quality);
        this.frameDiskCache.scheduleStore(compId, frame);
      } else {
        if (!this._captureCanvas) this._captureCanvas = document.createElement('canvas');
        const c = this._captureCanvas;
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        const imgData = ctx.createImageData(w, h);
        const rowBytes = w * 4;
        for (let y = 0; y < h; y++) {
          const src = y * rowBytes;
          const dst = (h - 1 - y) * rowBytes;
          imgData.data.set(pixels.subarray(src, src + rowBytes), dst);
        }
        ctx.putImageData(imgData, 0, 0);
        c.toBlob((blob) => {
          if (!blob) return;
          createImageBitmap(blob)
            .then((bitmap) => {
              this.frameCache.store(compId, frame, bitmap, quality);
              this.frameDiskCache.scheduleStore(compId, frame);
            })
            .catch(() => {});
        });
      }
    } catch (err) {
      console.error('[captureFrame] Error:', err);
    }
  }

  setCaptureEnabled(_enabled: boolean): void {}

  // ── Cached frame display ──────────────────────────────────────

  private _initCachedFrameQuad(): void {
    if (this._cachedFrameQuad) return;

    this._cachedFrameCanvas = document.createElement('canvas');
    this._cachedFrameCanvas.width = 1;
    this._cachedFrameCanvas.height = 1;
    this._cachedFrameCtx = this._cachedFrameCanvas.getContext('2d')!;

    this._cachedFrameTex = new THREE.CanvasTexture(this._cachedFrameCanvas);
    this._cachedFrameTex.minFilter = THREE.LinearFilter;
    this._cachedFrameTex.magFilter = THREE.LinearFilter;
    this._cachedFrameTex.premultiplyAlpha = false;

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: this._cachedFrameTex,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: false,
    });
    this._cachedFrameQuad = new THREE.Mesh(geo, mat);
    this._cachedFrameQuad.frustumCulled = false;
    this._cachedFrameQuad.renderOrder = -5;
    this._cachedFrameQuad.visible = false;
    this._cachedFrameQuad.name = 'cached-frame-quad';
    this.sceneManager.scene.add(this._cachedFrameQuad);
  }

  /**
   * Display a cached frame using a GPU-side texture — zero CPU round-trip.
   * This is the fast path, called when gpuTextureCache has the frame.
   */
  private _displayCachedFrameGPU(
    texture: THREE.Texture,
    compId: string,
    frameNum: number,
  ): void {
    const comp = this._composition;
    if (!comp) return;
    try {
      this._initCachedFrameQuad();

      const w = comp.width;
      const h = comp.height;
      const geo = this._cachedFrameQuad!.geometry as THREE.PlaneGeometry;
      if (
        Math.abs(geo.parameters.width - w) > 0.5 ||
        Math.abs(geo.parameters.height - h) > 0.5
      ) {
        geo.dispose();
        this._cachedFrameQuad!.geometry = new THREE.PlaneGeometry(w, h);
      }

      if (frameNum !== this._lastCachedFrameNum || compId !== this._lastCachedCompId) {
        this._lastCachedFrameNum = frameNum;
        this._lastCachedCompId = compId;
        // Swap the quad's material to use this GPU texture directly
        const mat = this._cachedFrameQuad!.material as THREE.MeshBasicMaterial;
        mat.map = texture;
        mat.needsUpdate = true;
      }

      const vp = this.cameraManager.getViewportTransform();
      this._cachedFrameQuad!.position.set(vp.panX, vp.panY, 0);

      if (!this._cachedFrameQuad!.visible) this._cachedFrameQuad!.visible = true;
      this.sceneManager.layerGroup.visible = false;
      this.sceneManager.compBounds.group.visible = false;
      this.selectionOverlay.hide();
    } catch (err) {
      console.warn('[Renderer] _displayCachedFrameGPU error:', err);
    }
  }

  /**
   * Fallback cached frame display via ImageBitmap → CanvasTexture.
   * Used when the GPU texture cache misses (e.g. frames loaded from disk).
   */
  private _displayCachedFrame(
    bitmap: ImageBitmap,
    compId: string,
    frameNum: number,
  ): void {
    const comp = this._composition;
    if (!comp) return;
    try {
      this._initCachedFrameQuad();

      const w = comp.width;
      const h = comp.height;
      const geo = this._cachedFrameQuad!.geometry as THREE.PlaneGeometry;
      if (
        Math.abs(geo.parameters.width - w) > 0.5 ||
        Math.abs(geo.parameters.height - h) > 0.5
      ) {
        geo.dispose();
        this._cachedFrameQuad!.geometry = new THREE.PlaneGeometry(w, h);
      }

      // Only re-upload when frame actually changes
      if (frameNum !== this._lastCachedFrameNum || compId !== this._lastCachedCompId) {
        this._lastCachedFrameNum = frameNum;
        this._lastCachedCompId = compId;

        const cw = this._cachedFrameCanvas!.width;
        const ch = this._cachedFrameCanvas!.height;
        if (cw !== bitmap.width || ch !== bitmap.height) {
          this._cachedFrameCanvas!.width = bitmap.width;
          this._cachedFrameCanvas!.height = bitmap.height;
        }
        // ALWAYS reset the image reference and needsUpdate
        // (Three.js CanvasTexture re-uploads when image ref changes)
        this._cachedFrameTex!.image = this._cachedFrameCanvas;
        this._cachedFrameCtx!.clearRect(0, 0, bitmap.width, bitmap.height);
        this._cachedFrameCtx!.drawImage(bitmap, 0, 0);
        this._cachedFrameTex!.needsUpdate = true;
      }

      const vp = this.cameraManager.getViewportTransform();
      this._cachedFrameQuad!.position.set(vp.panX, vp.panY, 0);

      if (!this._cachedFrameQuad!.visible) this._cachedFrameQuad!.visible = true;
      this.sceneManager.layerGroup.visible = false;
      this.sceneManager.compBounds.group.visible = false;
      this.selectionOverlay.hide();
    } catch (err) {
      console.warn('[Renderer] _displayCachedFrame error:', err);
    }
  }

  /** Forcefully restore full scene visibility — call when cache display ends. */
  private _hideCachedFrameDisplay(): void {
    if (this._cachedFrameQuad?.visible) {
      this._cachedFrameQuad.visible = false;
    }
    if (!this.sceneManager.layerGroup.visible) {
      this.sceneManager.layerGroup.visible = true;
    }
    if (!this.sceneManager.compBounds.group.visible) {
      this.sceneManager.compBounds.group.visible = true;
    }
    if (!this.selectionOverlay.visible) {
      this.selectionOverlay.show();
    }
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

    if (this._interactiveHandler) {
      document.removeEventListener('renderer:interactive', this._interactiveHandler);
    }
    if (this._toolUnsubscribe) {
      this._toolUnsubscribe();
      this._toolUnsubscribe = null;
    }
    if (this._kfUnsub) {
      this._kfUnsub();
      this._kfUnsub = null;
    }

    this.cacheInvalidator.dispose();
    this.gpuTextureCache.dispose();
    this.renderScheduler.dispose();
    this.adaptiveResolution.dispose();
    this.perfMonitor.dispose();
    this.frameDiskCache.dispose();
    this.frameCache.dispose();

    this._captureCanvas = null;

    if (this._activityHandler) {
      const h = this._activityHandler;
      document.removeEventListener('mousedown', h);
      document.removeEventListener('mousemove', h);
      document.removeEventListener('keydown', h);
      document.removeEventListener('wheel', h);
      this._activityHandler = null;
    }

    if (this._cachedFrameQuad) {
      this._cachedFrameQuad.geometry.dispose();
      (this._cachedFrameQuad.material as THREE.Material).dispose();
      this._cachedFrameQuad = null;
    }
    if (this._cachedFrameTex) {
      this._cachedFrameTex.dispose();
      this._cachedFrameTex = null;
    }
    this._cachedFrameCanvas = null;
    this._cachedFrameCtx = null;

    delete (window as any).__perfMonitor;
    delete (window as any).__workerPool;
    delete (window as any).__renderer;
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}