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
import { RenderScheduler } from './RenderScheduler';
import { PerfMonitor } from './monitoring/PerfMonitor';
import { resourceRegistry } from './utils/ResourceRegistry';
import { PropertyBinder } from '../animation/PropertyBinder';
import { useKeyframeStore } from '../state/keyframeStore';
import { useCompositionStore } from '../state/compositionStore';
import { useToolStore } from '../state/toolStore';
import { useTimelineStore } from '../state/timelineStore';
import { TOOLS } from '../config/constants';
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
  public readonly ramPreviewBuilder: RAMPreviewBuilder;
  public readonly perfMonitor: PerfMonitor;
  public readonly frameDiskCache: FrameDiskCache;
  public readonly propertyBinder: PropertyBinder;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;
  private _composition: Composition | null = null;
  private _captureCanvas: HTMLCanvasElement | null = null;
  private _interactiveHandler: ((e: Event) => void) | null = null;
  private _toolUnsubscribe: (() => void) | null = null;
  private _compUnsub: (() => void) | null = null;
  private _kfUnsub: (() => void) | null = null;
  private _lastLayersSnapshot = '';

  /** Cached nested-comp renderers keyed by sourceCompId */
  private _nestedRenderers = new Map<string, NestedCompRenderer>();

  /** Cached frame playback: fullscreen quad + texture */
  private _cachedFrameQuad: THREE.Mesh | null = null;
  private _cachedFrameTex: THREE.CanvasTexture | null = null;

  /** Load disk-cached frames into RAM after composition is applied */
  private _loadDiskCacheOnReady: ((compId: string) => void) | null = null;
  /** Activity handler for idle caching — stored for cleanup */
  private _activityHandler: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    // Transparent clear — CSS layer underneath handles comp bg + app bg
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

    // Cache system
    this.frameCache = new FrameCache();
    this.adaptiveResolution = new AdaptiveResolution();
    this.renderScheduler = new RenderScheduler();
    this.renderScheduler.setAdaptiveResolution(this.adaptiveResolution);
    this.renderScheduler.onRequestRender = () => this.renderLoop.requestRender();
    this.cacheInvalidator = new CacheInvalidator(this.frameCache);
    this.ramPreviewBuilder = new RAMPreviewBuilder(this.frameCache);

    // Invalidate frame cache when layer state changes (positions, colors, size)
    // Uses shallow snapshot hash to detect any layer property mutation.
    this._compUnsub = useCompositionStore.subscribe((state) => {
      const cid = state.activeCompositionId;
      if (!cid) return;
      const comp = state.compositions.find(c => c.id === cid);
      if (!comp) return;
      const snap = comp.layers.map(l =>
        `${l.id}:${l.transform.position.x},${l.transform.position.y},` +
        `${l.transform.scale.x},${l.transform.scale.y},${l.transform.rotation},` +
        `${l.opacity},${l.visible},${JSON.stringify(l.data)}`
      ).join('|');
      if (snap !== this._lastLayersSnapshot) {
        this._lastLayersSnapshot = snap;
        this.frameCache.invalidateAll(cid);
        this.renderLoop.requestRender();
      }
    });
    this.ramPreviewBuilder.setRendererRef(() => this);
    this.frameDiskCache = new FrameDiskCache(this.frameCache);
    this.propertyBinder = new PropertyBinder(useKeyframeStore.getState().engine);

    // Invalidate frame cache whenever keyframes change — stale cached frames
    // would otherwise bypass keyframe evaluation in beforeRender.
    let _lastKfRevision = useKeyframeStore.getState().revision;
    this._kfUnsub = useKeyframeStore.subscribe((state) => {
      if (state.revision === _lastKfRevision) return; // skip selection changes
      _lastKfRevision = state.revision;
      const cid = useCompositionStore.getState().activeCompositionId;
      if (cid) {
        this.frameCache.invalidateAll(cid);
        this.renderLoop.requestRender();
      }
    });

    this.perfMonitor = new PerfMonitor();
    this.perfMonitor.setFrameCache(this.frameCache);

    // Expose cache, builder, perf monitor, and resource trackers globally
    (window as any).__frameCache = this.frameCache;
    (window as any).__ramPreviewBuilder = this.ramPreviewBuilder;
    (window as any).__frameDiskCache = this.frameDiskCache;
    (window as any).__adaptiveResolution = this.adaptiveResolution;
    (window as any).__perfMonitor = this.perfMonitor;
    (window as any).__resourceRegistry = resourceRegistry;
    (window as any).__renderer = this;

    this.renderLoop = new RenderLoop(this.renderer, this.sceneManager.scene, this.cameraManager.camera);
    this.resizeHandler = new ResizeHandler(this.renderer, this.cameraManager, this.renderLoop);
    // Use scheduler for render requests — it tracks priority and feeding back to adaptive quality
    // Camera changes trigger scheduler request (which automatically calls renderLoop.requestRender)
    this.cameraManager.onChanged = () => this.renderScheduler.request('interactive');

    // Listen for interactive mode toggle (from ModalTransform, scrub handlers, etc.)
    this._interactiveHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.renderLoop.setInteractive(!!detail?.on);
    };
    document.addEventListener('renderer:interactive', this._interactiveHandler);

    // Wire dropped frame reporting from the loop to scheduler and monitor
    this.renderLoop.onFrameDropped = () => {
      this.renderScheduler.recordDroppedFrame();
      this.perfMonitor.recordDroppedFrame();
    };

    // Activity detection for idle caching — gated by autoCache setting.
    // When autoCache is off, idle caching is cancelled immediately so
    // the background prefetch loop doesn't keep running unexpectedly.
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
    // Store reference for cleanup
    this._activityHandler = reportActivity;

    // Load disk-cached frames on startup (triggered after first applyComposition)
    this._loadDiskCacheOnReady = (compId: string) => {
      this.frameDiskCache.loadIntoCache(compId).then(count => {
        if (count > 0) console.log(`[Cache] Loaded ${count} frames from disk cache`);
      }).catch(() => {});
    };

    let renderStart = 0;
    this.renderLoop.beforeRender = () => {
      renderStart = performance.now();

      // CRITICAL: Read from store, not this._composition, because the store
      // creates a new object each time setCurrentTime is called during playback.
      // this._composition is a stale reference with currentTime stuck at 0.
      const cs = useCompositionStore.getState();
      const comp = cs.activeCompositionId
        ? cs.compositions.find(c => c.id === cs.activeCompositionId)
        : null;
      if (!comp) return;

      const frame = Math.floor(comp.currentTime * comp.fps);
      const totalKf = this.propertyBinder.engine.totalKeyframes;

      // Only use cache when ZERO keyframes exist in the entire project.
      // This prevents stale cached frames from bypassing keyframe animation —
      // even if the cache was created before keyframes were added, the
      // totalKeyframes check ensures we never display a cached snapshot
      // when any layer has animated properties.
      const canUseCache = totalKf === 0 && !ModalTransform.activeAnywhere;

      if (canUseCache) {
        const cached = this.frameCache.get(comp.id, frame);
        if (cached && cached.imageBitmap) {
          this._displayCachedFrame(cached.imageBitmap);
          this.perfMonitor.recordCacheAccess(true);
          // Uncap FPS during cached playback for smoothness
          if (this.renderLoop.targetFps > 0) {
            this.renderLoop.setTargetFps(0);
          }
          return;
        }
      }

      // No cached frame — hide cached quad and render normally
      this._hideCachedFrameDisplay();
      this.perfMonitor.recordCacheAccess(false);
      // Re-cap FPS to comp's target when doing full 3D renders
      if (this.renderLoop.targetFps === 0) {
        this.renderLoop.setTargetFps(comp.fps);
      }

      // Apply keyframe overrides whenever keyframes exist in the project.
      // This shows the correct interpolated position during playback AND
      // when scrubbing the playhead. The ModalTransform guard ensures
      // overrides don't fight the user during interactive drag operations.
      if (totalKf > 0 && !ModalTransform.activeAnywhere) {
        const count = this.propertyBinder.evaluateFrame(comp.id, frame);
        if (count > 0 && this.propertyBinder.hasOverrides) {
          this.layerSync.setRuntimeOverridesActive(true);
          this.layerSync.applyRuntimeOverrides(this.propertyBinder.overrides);
        }
      }

      this._updateLayerFrameVisibility();
      this._processNestedComps();
      this._processEffects();
    };

    this.renderLoop.onFrame = (stats: FrameStats) => {
      const vp = this.cameraManager.getViewportTransform();
      const budget = this.renderScheduler.getBudget();
      const ramMB = Math.round(this.frameCache.getMemoryUsage() / (1024 * 1024));

      // Report render time to scheduler and perf monitor
      const renderTime = renderStart > 0 ? performance.now() - renderStart : 0;
      if (renderTime > 0) {
        this.renderScheduler.didRender(renderTime);
        this.perfMonitor.recordFrameTime(renderTime);
      }

      // M11: Clear runtime overrides after render (restore renderers for next sync)
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

    // Wire adaptive resolution quality changes → actually resize the renderer
    this.adaptiveResolution.onQualityChange = (quality) => {
      // Store current quality and render at reduced resolution
      this._applyQualityScale(quality);
      this.renderLoop.requestRender();
    };

    // M9: Tool-dependent gizmo visibility — subscribe to tool store
    const updateGizmo = (tool: string) => {
      if (tool === TOOLS.MOVE) this.selectionOverlay.gizmoMode = 'move';
      else if (tool === TOOLS.ROTATE) this.selectionOverlay.gizmoMode = 'rotate';
      else if (tool === TOOLS.SCALE) this.selectionOverlay.gizmoMode = 'scale';
      else this.selectionOverlay.gizmoMode = null;
      this.renderLoop.requestRender();
    };
    this._toolUnsubscribe = useToolStore.subscribe((state) => updateGizmo(state.activeTool));
    updateGizmo(useToolStore.getState().activeTool);

    // Force an initial render so the viewport shows something (scene bg, grid, comp bounds)
    // even before a composition is applied or the first resize observer fires.
    this.renderLoop.requestRender();
  }

  applyComposition(comp: Composition): void {
    const prev = this._composition;
    const changedSize = !prev
      || prev.width !== comp.width
      || prev.height !== comp.height;

    this._composition = comp;

    // Always re-apply the scene composition (bgQuad, bounds, grid) so the bgQuad
    // is re-created on every call. The identity guard below was preventing bgQuad
    // recovery if it was ever removed from the scene between calls.
    this.sceneManager.applyComposition(comp.width, comp.height, comp.backgroundColor);

    // Only reset camera + render loop on size/fps changes
    if (changedSize) {
      this.cameraManager.setCompositionSize(comp.width, comp.height);
    }

    this.renderLoop.setTargetFps(comp.fps);
    this.renderScheduler.setFrameBudget(comp.fps);
    this.adaptiveResolution.setTargetFps(comp.fps);
    this.perfMonitor.setTargetFps(comp.fps);
    this.perfMonitor.setCacheBudget(this.frameCache.maxBytes);

    // Force an immediate render so the viewport shows the composition on first mount
    this.renderLoop.render();
    this.renderLoop.requestRender();

    // Load disk-cached frames into RAM (if available)
    this._loadDiskCacheOnReady?.(comp.id);
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

  /** Enable/disable frame capture — unused; RAMPreviewBuilder captures directly via captureFrame(). */
  /** Run the before-render hooks (visibility, nested comps, effects) — used by RAMPreviewBuilder for sync render */
  runBeforeRenderHooks(): void {
    // CRITICAL: Read from store, not this._composition — same stale-ref issue as beforeRender.
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find(c => c.id === cs.activeCompositionId)
      : null;
    if (comp) {
      const frame = Math.floor(comp.currentTime * comp.fps);
      this.propertyBinder.evaluateFrame(comp.id, frame);
      // Apply keyframe overrides whenever keyframes exist.
      // The ModalTransform guard prevents interference during drag.
      if (this.propertyBinder.hasOverrides && !ModalTransform.activeAnywhere) {
        this.layerSync.setRuntimeOverridesActive(true);
        this.layerSync.applyRuntimeOverrides(this.propertyBinder.overrides);
      }
    }
    this._updateLayerFrameVisibility();
    this._processNestedComps();
    this._processEffects();
    // M11: Clear runtime overrides after RAM preview render
    this.layerSync.setRuntimeOverridesActive(false);
  }

  /** Synchronously render the current scene (used by RAMPreviewBuilder to capture without async rAF) */
  renderSynchronous(): void {
    this.renderer.render(this.sceneManager.scene, this.cameraManager.camera);
  }

  /**
   * Capture the current framebuffer and store to cache.
   * Uses OffscreenCanvas.transferToImageBitmap() for synchronous capture
   * (no blob encoding/decoding overhead). Falls back to async toBlob path
   * if transferToImageBitmap is unavailable.
   */
  captureFrame(compId: string, frame: number, quality: CacheQuality): void {
    try {
      const w = this.renderer.domElement.width;
      const h = this.renderer.domElement.height;
      if (w === 0 || h === 0) return;

      const pixels = new Uint8Array(w * h * 4);
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Flip Y: OpenGL reads bottom-up, canvas expects top-down
      // Use OffscreenCanvas with transferToImageBitmap for synchronous capture
      if (typeof OffscreenCanvas !== 'undefined' && typeof (OffscreenCanvas.prototype as any).transferToImageBitmap === 'function') {
        const oc = new OffscreenCanvas(w, h);
        const octx = oc.getContext('2d')!;
        const imgData = octx.createImageData(w, h);
        const rowBytes = w * 4;
        for (let y = 0; y < h; y++) {
          const srcOff = y * rowBytes;
          const dstOff = (h - 1 - y) * rowBytes;
          for (let x = 0; x < rowBytes; x++) imgData.data[dstOff + x] = pixels[srcOff + x];
        }
        octx.putImageData(imgData, 0, 0);
        // Synchronous: returns ImageBitmap immediately
        const bitmap = oc.transferToImageBitmap();
        this.frameCache.store(compId, frame, bitmap, quality);
        // Persist to disk cache (async, debounced)
        this.frameDiskCache.scheduleStore(compId, frame);
      } else {
        // Fallback: use regular canvas with toBlob + createImageBitmap (async)
        if (!this._captureCanvas) this._captureCanvas = document.createElement('canvas');
        const c = this._captureCanvas;
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        const imgData = ctx.createImageData(w, h);
        const rowBytes = w * 4;
        for (let y = 0; y < h; y++) {
          const srcOff = y * rowBytes;
          const dstOff = (h - 1 - y) * rowBytes;
          for (let x = 0; x < rowBytes; x++) imgData.data[dstOff + x] = pixels[srcOff + x];
        }
        ctx.putImageData(imgData, 0, 0);
        c.toBlob((blob) => {
          if (!blob) return;
          createImageBitmap(blob).then(bitmap => {
            this.frameCache.store(compId, frame, bitmap, quality);
            this.frameDiskCache.scheduleStore(compId, frame);
          }).catch(() => {});
        });
      }
    } catch {
      // Silently fail
    }
  }

  setCaptureEnabled(_enabled: boolean): void {
    // kept for API compatibility; RAMPreviewBuilder uses captureFrame() directly
  }

  /** Apply quality scaling to the renderer dimensions only.
   *  Camera viewport stays at CSS layout size — only the drawing buffer changes. */
  private _applyQualityScale(quality: 'full' | 'half' | 'quarter'): void {
    const comp = this._composition;
    if (!comp) return;
    const factor = quality === 'full' ? 1 : quality === 'half' ? 0.5 : 0.25;
    // Resize the renderer drawing buffer to the quality-scaled resolution.
    // Camera viewport remains at CSS layout size — don't call setViewportSize().
    this.renderer.setSize(
      Math.max(1, Math.round(comp.width * factor)),
      Math.max(1, Math.round(comp.height * factor)),
    );
    // Transparent clear after setSize — CSS layer handles the bg
    this.renderer.setClearColor(0x000000, 0);
  }

  // ── Cached frame display ──────────────────────────────────────

  /** Initialize the fullscreen quad for displaying cached frames */
  private _initCachedFrameQuad(): void {
    if (this._cachedFrameQuad) return;
    // Temp geometry — resized on first use
    const geo = new THREE.PlaneGeometry(1, 1);
    this._cachedFrameTex = new THREE.CanvasTexture(document.createElement('canvas'));
    this._cachedFrameTex.minFilter = THREE.LinearFilter;
    this._cachedFrameTex.magFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({
      map: this._cachedFrameTex,
      depthTest: false,
      depthWrite: false,
      transparent: true, // Allow transparent alpha from cached frames to show CSS layer underneath
    });
    this._cachedFrameQuad = new THREE.Mesh(geo, mat);
    this._cachedFrameQuad.frustumCulled = false;
    this._cachedFrameQuad.renderOrder = -5;
    this._cachedFrameQuad.visible = false;
    this._cachedFrameQuad.name = 'cached-frame-quad';
    this.sceneManager.scene.add(this._cachedFrameQuad);
  }

  /** Replace the 3D scene with a cached frame (fullscreen quad) */
  private _displayCachedFrame(bitmap: ImageBitmap): void {
    const comp = this._composition;
    if (!comp) return;
    this._initCachedFrameQuad();

    // Size quad to composition dimensions so it fills the orthographic camera view
    const w = comp.width;
    const h = comp.height;
    const geo = this._cachedFrameQuad!.geometry as THREE.PlaneGeometry;
    if (Math.abs(geo.parameters.width - w) > 0.5 || Math.abs(geo.parameters.height - h) > 0.5) {
      geo.dispose();
      this._cachedFrameQuad!.geometry = new THREE.PlaneGeometry(w, h);
    }

    // Update texture with new frame
    this._cachedFrameTex!.image = bitmap;
    this._cachedFrameTex!.needsUpdate = true;

    // CRITICAL: Position quad at camera pan offset so it follows viewport panning.
    // The orthographic camera pans by shifting its frustum (left/right/top/bottom += panX/panY).
    // A world-space quad at origin would appear to drift when panned, so we counter-shift
    // by placing the quad at the camera's current view center.
    const vp = this.cameraManager.getViewportTransform();
    this._cachedFrameQuad!.position.set(vp.panX, vp.panY, 0);

    // Show quad, hide 3D layers + comp bounds
    if (!this._cachedFrameQuad!.visible) this._cachedFrameQuad!.visible = true;
    this.sceneManager.layerGroup.visible = false;
    this.sceneManager.compBounds.group.visible = false;

    // Also hide the selection overlay (SVG gizmos/handles) so they don't float
    // in empty space while the layers underneath are hidden
    this.selectionOverlay.hide();
  }

  /** Hide the cached frame quad and restore 3D scene */
  private _hideCachedFrameDisplay(): void {
    if (this._cachedFrameQuad && this._cachedFrameQuad.visible) {
      this._cachedFrameQuad.visible = false;
    }
    if (!this.sceneManager.layerGroup.visible) this.sceneManager.layerGroup.visible = true;
    // Note: compBounds.group is always disabled (CSS handles bounds visually)
    // Restore selection overlay visibility that was hidden during cached frame display
    if (!this.selectionOverlay.visible) this.selectionOverlay.show();
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
    if (this._compUnsub) { this._compUnsub(); this._compUnsub = null; }
    if (this._kfUnsub) { this._kfUnsub(); this._kfUnsub = null; }
    this.cacheInvalidator.dispose();
    this.renderScheduler.dispose();
    this.adaptiveResolution.dispose();
    this.perfMonitor.dispose();
    this.frameDiskCache.dispose();
    this.frameCache.dispose();
    this._captureCanvas = null;
    // Clean up activity event listeners
    if (this._activityHandler) {
      const h = this._activityHandler;
      document.removeEventListener('mousedown', h);
      document.removeEventListener('mousemove', h);
      document.removeEventListener('keydown', h);
      document.removeEventListener('wheel', h);
      this._activityHandler = null;
    }
    // Dispose cached frame resources
    if (this._cachedFrameQuad) {
      this._cachedFrameQuad.geometry.dispose();
      (this._cachedFrameQuad.material as THREE.Material).dispose();
      this._cachedFrameQuad = null;
    }
    if (this._cachedFrameTex) {
      this._cachedFrameTex.dispose();
      this._cachedFrameTex = null;
    }
    // Remove global references
    delete (window as any).__perfMonitor;
    delete (window as any).__workerPool;
    delete (window as any).__renderer;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}