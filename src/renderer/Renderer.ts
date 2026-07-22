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
import { VideoFrameCache } from './cache/VideoFrameCache';
import { TexturePreloader } from './textures/TexturePreloader';
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
import type { CompData, VideoData, AudioData, TransitionData } from '../types/layer';
import { VideoLayerRenderer } from './layers/VideoLayerRenderer';
import { AudioLayerRenderer } from './layers/AudioLayerRenderer';
import { AdjustmentCompositor } from './compositing/AdjustmentCompositor';
import { AdjustmentLayerRenderer } from './layers/AdjustmentLayerRenderer';
import { MotionBlurCompositor } from './compositing/MotionBlurCompositor';
import { TransitionCompositor } from './transitions/TransitionCompositor';
import { getTransitionById } from './transitions/library';
import { Scene3DManager } from './Scene3DManager';
import { ModifierEngine } from './ModifierEngine';
import { LightLayerRenderer } from './layers/LightLayerRenderer';
import { Model3DLayerRenderer } from './layers/Model3DLayerRenderer';
import type { LightData } from '../types/layer';
import type { Model3DData } from '../types/model3d';

export interface RendererState {
  fps: number;
  zoom: number;
  frameCount: number;
  quality?: string;
  ramCacheMB?: number;
  droppedFrames?: number;
  gpuMemoryMB?: number;
  gpuMemoryBudgetMB?: number;
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
  public readonly videoFrameCache: VideoFrameCache;
  public readonly propertyBinder: PropertyBinder;
  public readonly motionBlurCompositor: MotionBlurCompositor;
  public readonly texturePreloader: TexturePreloader;
  public readonly transitionCompositor: TransitionCompositor;
  public readonly scene3D: Scene3DManager;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;
  private _composition: Composition | null = null;
  private _captureCanvas: HTMLCanvasElement | null = null;
  private _interactiveHandler: ((e: Event) => void) | null = null;
  private _viewModeHandler: ((e: Event) => void) | null = null;
  private _toolUnsubscribe: (() => void) | null = null;
  private _kfUnsub: (() => void) | null = null;

  /** Cache render time override. null = use store's currentTime. */
  private _cacheRenderTimeOverride: number | null = null;

  /** Track last displayed cached frame to avoid re-uploading identical textures */
  private _lastCachedFrameNum = -1;
  private _lastCachedCompId = '';

  /** AE-style viewer clipping: layer pixels render only inside the comp rectangle. */
  private _clipToCompBounds = true;
  private _compositionScissorActive = false;


  private _nestedRenderers = new Map<string, NestedCompRenderer>();
  private _audioRenderers = new Map<string, AudioLayerRenderer>();
  private _lightRenderers = new Map<string, LightLayerRenderer>();
  private _model3dRenderers = new Map<string, Model3DLayerRenderer>();
  public readonly adjustmentCompositor: AdjustmentCompositor;

  private _cachedFrameQuad: THREE.Mesh | null = null;
  private _cachedFrameTex: THREE.CanvasTexture | null = null;
  private _cachedFrameCanvas: HTMLCanvasElement | null = null;
  private _cachedFrameCtx: CanvasRenderingContext2D | null = null;

  /** Active transition data — array when we need to render stacked transitions */
  private _activeTransitions: Array<{
    layerId: string;
    transitionId: string;
    params: Record<string, number | string | boolean>;
    progress: number;
    startFrame: number;
    endFrame: number;
  }> | null = null;

  /** FBOs for transition frame captures and chain ping-pong */
  private _transitionFBO_A: THREE.WebGLRenderTarget | null = null;
  private _transitionFBO_B: THREE.WebGLRenderTarget | null = null;
  private _transitionFBO_Accumulated: THREE.WebGLRenderTarget | null = null;

  /** IDs of transition layers (hidden during FBO renders) */
  private _transitionLayerIds: string[] = [];

  private _activityHandler: (() => void) | null = null;
  private _loadDiskCacheOnReady: ((compId: string) => void) | null = null;

  /** Cached FBO for camera preview rendering — avoids allocate/dispose per frame */
  private _previewFBO: THREE.WebGLRenderTarget | null = null;
  private _previewFBOSize = { w: 0, h: 0 };

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
    this.adjustmentCompositor = new AdjustmentCompositor(
      this.renderer,
      this.sceneManager,
      this.cameraManager,
      this.layerSync,
    );
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
    this.videoFrameCache = new VideoFrameCache();
    this.propertyBinder = new PropertyBinder(useKeyframeStore.getState().engine);
    this.motionBlurCompositor = new MotionBlurCompositor(this.renderer, this.layerSync);
    this.transitionCompositor = new TransitionCompositor(this.renderer);
    this.texturePreloader = new TexturePreloader();
    this.scene3D = new Scene3DManager();
    this.scene3D.setRenderer(this.renderer);
    this._previewFBO = null;

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
    (window as any).__gpuTextureCache = this.gpuTextureCache;
    (window as any).__videoFrameCache = this.videoFrameCache;

    // Share the WebGL renderer with the effect thumbnail generator
    import('./effects/EffectThumbnailGenerator').then(({ effectThumbnailGenerator }) => {
      effectThumbnailGenerator.setRenderer(this.renderer);
    }).catch(() => {});

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

    // Listen for view mode toggle (Free View ↔ Perspective)
    // Free View = orthographic (arrange scene), Perspective = use comp.perspective3D settings
    // Free View / Active Camera toggle state
    (window as any).__freeViewMode = false;
    (window as any).__freeOrbitX = 0.2; // pitch (radians, ~11° above horizon)
    (window as any).__freeOrbitY = 0.8; // yaw (radians)
    (window as any).__freeDistance = 800; // distance from focal point
    (window as any).__freeLookAtX = 0; // focal point (orbit center)
    (window as any).__freeLookAtY = 0;
    (window as any).__freeLookAtZ = 0;
    this._viewModeHandler = ((e: Event) => {
      const detail = (e as CustomEvent).detail;
      const wasFree = !!(window as any).__freeViewMode;
      (window as any).__freeViewMode = !!detail?.free;
      const comp = this._composition;
      if (!comp) return;
      // Invalidate cached frames when switching view modes so stale
      // 2D cached frames don't bleed into the 3D perspective view.
      if (wasFree !== (window as any).__freeViewMode) {
        this._hideCachedFrameDisplay();
        this._lastCachedFrameNum = -1;
        this._lastCachedCompId = '';
      }
      this._applyPerspectiveCamera(comp);
      this.renderLoop.requestRender();
    }) as EventListener;
    document.addEventListener('viewport:viewmode', this._viewModeHandler);

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
      if (!comp) {
        this._disableCompositionScissor();
        return;
      }

      // ── Clear the drawing buffer at the start of every frame ──
      // Use composition background color; transparent when bg is black
      // so the dark area behind the grid doesn't appear as a black rectangle.
      {
        const canvas = this.renderer.domElement;
        const oldTarget = this.renderer.getRenderTarget();
        const oldClearColor = new THREE.Color();
        this.renderer.getClearColor(oldClearColor);
        const oldClearAlpha = this.renderer.getClearAlpha();
        this.renderer.setRenderTarget(null);
        this.renderer.setScissorTest(false);
        this.renderer.setScissor(0, 0, canvas.width, canvas.height);
        this.renderer.setViewport(0, 0, canvas.width, canvas.height);

        // Clear with the composition's background color
        const bgColor = comp.backgroundColor ?? '#000000';
        const bgHex = parseInt(bgColor.replace('#', '0x'), 16);
        this.renderer.setClearColor(bgHex, 1);

        this.renderer.clear(true, true, true);
        this.renderer.setClearColor(oldClearColor, oldClearAlpha);
        this.renderer.setRenderTarget(oldTarget);
      }

      const effectiveTime =
        this._cacheRenderTimeOverride !== null
          ? this._cacheRenderTimeOverride
          : comp.currentTime;
      const frame = Math.floor(effectiveTime * comp.fps);

      const isInCacheBuild = this._cacheRenderTimeOverride !== null;

      // Sync video volume/mute always (even when stopped)
      if (!isInCacheBuild) {
        this._syncVideoAudio(comp);
      }

      // Sync video playback to composition time (skip when stopped)
      const playbackState = useTimelineStore.getState().playbackState;

      // Texture preloader: during playback, kick off loads for image layers
      // that will become visible within the lookahead window.
      if (!isInCacheBuild) {
        this.texturePreloader.isPlaying = playbackState === 'playing';
        this.texturePreloader.update(comp, frame);
      }
      if (!isInCacheBuild && playbackState !== 'stopped') {
        this._syncVideoLayers(comp, effectiveTime);
      }

    // Sync audio layers — ONLY treat "playing" as playing.
      // Passing paused/stopped as "isPlaying" causes audio to be re-seeked
      // every frame while HTMLAudioElement is still playing, producing a
      // stutter-loop, and leaves the element playing if the RAF loop stops
      // (e.g. tab switch).
      if (!isInCacheBuild) {
        this._syncAudioLayers(comp, effectiveTime, playbackState === 'playing');
      }

      // ── Detect active transition layers ──
      // MUST run before the cached-frame early return so transitions work during
      // RAM preview playback. Collects ALL overlapping transition layers and
      // chains them in startFrame order for stacked blending.
      this._activeTransitions = null;
      this._transitionLayerIds = [];
      for (const l of comp.layers) {
        if (l.type === 'transition' && l.visible) {
          this._transitionLayerIds.push(l.id);
        }
      }
      const activeTransLayers = comp.layers
        .filter(l => l.type === 'transition' && l.visible && frame >= l.startFrame && frame <= l.endFrame)
        .sort((a, b) => a.startFrame - b.startFrame);
      
      if (activeTransLayers.length > 0) {
        const collected: Renderer['_activeTransitions'] = [];
        for (const layer of activeTransLayers) {
          const tData = layer.data as TransitionData;
          if (!tData || !getTransitionById(tData.transitionType)) continue;
          const start = layer.startFrame;
          const end = layer.endFrame;
          const duration = Math.max(1, end - start);
          const p = Math.min(1, Math.max(0, (frame - start) / duration));
          collected.push({
            layerId: layer.id,
            transitionId: tData.transitionType,
            params: {
              ...tData.customParams,
              feather: tData.feather,
              angle: tData.angle,
              centerX: tData.centerX,
              centerY: tData.centerY,
            },
            progress: p,
            startFrame: start,
            endFrame: end,
          });
        }
        if (collected.length > 0) {
          this._activeTransitions = collected;
        }
      }

      // GPU-accelerated cached frame display — skip when transitions are active
      // because transitions need live A/B frame renders.
      if (!this._activeTransitions && !isInCacheBuild && !ModalTransform.activeAnywhere && !comp.perspective3D) {
        const gpuTex = this.gpuTextureCache.get(comp.id, frame);
        if (gpuTex) {
          this._displayCachedFrameGPU(gpuTex, comp.id, frame);
          this.perfMonitor.recordCacheAccess(true);
          this._applyCompositionScissor(comp);
          return;
        }
        const cached = this.frameCache.get(comp.id, frame);
        if (cached?.imageBitmap) {
          this._displayCachedFrame(cached.imageBitmap, comp.id, frame);
          this.perfMonitor.recordCacheAccess(true);
          this._applyCompositionScissor(comp);
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
      this.effectsRenderer.setCurrentTime(effectiveTime);
      this._processEffects();

      // Adjustment layers: composite everything-below through their effect chains.
      this.adjustmentCompositor.prepareFrame(comp.layers, comp.width, comp.height, frame);
      if (this.adjustmentCompositor.hasActiveAdjustments) {
        for (const layer of comp.layers) {
          if (layer.type !== 'adjustment') continue;
          const r = this.layerSync.getRenderer(layer.id);
          if (r instanceof AdjustmentLayerRenderer) {
            r.setCompSize(comp.width, comp.height);
          }
        }
        this.adjustmentCompositor.execute(comp.layers, comp.width, comp.height);
      }

      // Motion blur: render moving layers at sub-frame samples and accumulate.
      if (comp.motionBlur?.enabled && !isInCacheBuild && !ModalTransform.activeAnywhere) {
        this.motionBlurCompositor.apply(comp, this.sceneManager.scene, this.cameraManager.camera as any, frame);
      }

      // 3D Perspective mode — use composition settings instead of camera layers
      if (comp.perspective3D) {
        this._applyPerspectiveCamera(comp);
      } else {
        this.scene3D.isActive = false;
        this.cameraManager.setPerspectiveCamera(null);
        this.renderLoop.setCamera(this.cameraManager.camera);
        // Clear 3D perspective flags for ModalTransform
        (window as any).__perspectiveActive = false;
        (window as any).__perspectiveCamera = null;
      }

      // Ensure transition layers are hidden from normal rendering
      // (they don't render geometry, only affect compositing)
      for (const id of this._transitionLayerIds) {
        const r = this.layerSync.getRenderer(id);
        if (r) r.setVisible(false);
      }

      // Sync lights (works independently of camera layers)
      this.scene3D.setupDefaultLights(this.sceneManager.scene);
      this.scene3D.syncLights(comp.layers, this.sceneManager.scene);

      // Apply ModifierEngine transforms and handle 3D layer positioning
      const overridesActive = this.layerSync.isRuntimeOverridesActive;
      for (const layer of comp.layers) {
        const layerRenderer = this.layerSync.getRenderer(layer.id);
        if (layerRenderer) {
          // When runtime overrides are active (keyframe animation), skip the
          // transform update for animated layers — applyRuntimeOverrides already
          // set the correct interpolated transforms. Overwriting here would
          // replace the animated values with the base layer.transform values,
          // effectively killing the animation.
          const hasOverride = overridesActive && this.propertyBinder.overrides.has(layer.id);
          if (!hasOverride) {
            // Apply Modifiers (wiggle, etc.)
            const modifiedTransform = ModifierEngine.apply(layer, comp.currentTime);
            layerRenderer.updateTransform(modifiedTransform);
          }

          // Handle 3D switch — use updateTransform3D for full position/rotation/scale/extrusion
          if (layer.is3D && layer.transform3D) {
            layerRenderer.updateTransform3D(layer.transform3D);
          }
        }

        // Sync light layers (separate from BaseLayerRenderer)
        if (layer.type === 'light') {
          this._syncLightLayer(layer);
        }

        // Sync 3D model layers
        if (layer.type === 'model3d' && layer.is3D) {
          this._syncModel3DLayer(layer);
        }
      }

      // AE-style clipping: after all offscreen/effect prep is done, restrict the
      // final visible WebGL render to the composition rectangle. DOM overlays
      // like selection outlines/gizmos remain visible outside the comp.
      // Only apply composition scissor in 2D/orthographic mode — in 3D perspective
      // mode the scissor would clip incorrectly because worldToScreen uses ortho projection.
      if (!comp.perspective3D) {
        this._applyCompositionScissor(comp);
      } else {
        this._disableCompositionScissor();
      }
    };

    this.renderLoop.onFrame = (stats: FrameStats) => {
      // Scissor is only for the final scene render. Disable it immediately
      // after the frame so thumbnail/offscreen/cache passes don't inherit it.
      this._disableCompositionScissor();

      // Restore layer visibility that AdjustmentCompositor may have modified
      const cs2 = useCompositionStore.getState();
      const activeComp = cs2.activeCompositionId
        ? cs2.compositions.find((c) => c.id === cs2.activeCompositionId)
        : null;
      if (activeComp) {
        const restoreFrame = Math.floor(activeComp.currentTime * activeComp.fps);
        this.adjustmentCompositor.restoreVisibility(activeComp.layers, restoreFrame);
        // Restore motion blur layer visibility
        if (activeComp.motionBlur?.enabled) {
          this.motionBlurCompositor.restore(activeComp, this.sceneManager.scene);
        }
      }

      const vp = this.cameraManager.getViewportTransform();
      const budget = this.renderScheduler.getBudget();
      const ramMB = Math.round(this.frameCache.getMemoryUsage() / (1024 * 1024));
      const gpuMB = Math.round(this.gpuTextureCache.usedBytes / (1024 * 1024));
      const gpuBudgetMB = Math.round(this.gpuTextureCache.maxBytes / (1024 * 1024));

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
        gpuMemoryMB: gpuMB,
        gpuMemoryBudgetMB: gpuBudgetMB,
      };
      // ── Apply transitions (overwrite canvas with blended A/B frames) ──
      if (this._activeTransitions) {
        this._executeTransitions(this._activeTransitions);
        this._activeTransitions = null;
      }

      this._onStateChange?.(this._state);
    };

    this.resizeHandler.observe(container);

    // Update perspective camera aspect when viewport resizes
    this.resizeHandler.setCallback((_w: number, _h: number) => {
      const comp = this._composition;
      if (comp?.perspective3D) {
        const cam = this.scene3D.perspectiveCamera;
        cam.aspect = this.cameraManager.viewportWidth / this.cameraManager.viewportHeight;
        cam.updateProjectionMatrix();
        this.renderLoop.requestRender();
      }
    });

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

    this.sceneManager.applyComposition(comp.width, comp.height, comp.backgroundColor, comp.layers.some(l => l.is3D || l.type === 'camera'));

    // Update skybox color to match composition background
    this.sceneManager.updateBackgroundColor(comp.backgroundColor ?? '#000000');

    if (changedSize) {
      this.cameraManager.setCompositionSize(comp.width, comp.height);
      // Dispose cached preview FBO so it recreates at the new size
      this._previewFBO?.dispose();
      this._previewFBO = null;
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

  /**
   * AE-style comp clipping.
   * ON: layer contents are clipped to the composition rectangle.
   * OFF: full layer contents can render outside the comp viewer.
   */
  setClipToCompositionBounds(enabled: boolean): void {
    this._clipToCompBounds = enabled;
    if (!enabled) this._disableCompositionScissor();
    this.renderLoop.requestRender();
  }

  get clipToCompositionBounds(): boolean {
    return this._clipToCompBounds;
  }

  /**
   * Apply a WebGL scissor rectangle matching the composition bounds.
   *
   * IMPORTANT: We ONLY set the scissor rect. We do NOT change the viewport.
   * The viewport controls the NDC→framebuffer mapping and MUST stay at the
   * full canvas so world coordinates render at their correct screen
   * positions. The scissor rect only clips which pixels actually get
   * written — it does not affect the coordinate mapping.
   *
   * Rounding is INWARD on all edges (ceil for left/bottom, floor for
   * right/top) so the scissor is guaranteed AT or INSIDE the comp edges.
   */
  private _applyCompositionScissor(comp: Composition): void {
    if (!this._clipToCompBounds) {
      this._disableCompositionScissor();
      return;
    }

    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      this._disableCompositionScissor();
      return;
    }

    const halfW = comp.width / 2;
    const halfH = comp.height / 2;

    // Convert composition corners to CSS screen space.
    const corners = [
      this.cameraManager.worldToScreen(-halfW,  halfH),
      this.cameraManager.worldToScreen( halfW,  halfH),
      this.cameraManager.worldToScreen( halfW, -halfH),
      this.cameraManager.worldToScreen(-halfW, -halfH),
    ];

    let left = Math.min(...corners.map(p => p.x));
    let right = Math.max(...corners.map(p => p.x));
    let top = Math.min(...corners.map(p => p.y));
    let bottom = Math.max(...corners.map(p => p.y));

    // Clamp to canvas CSS bounds.
    left = Math.max(0, Math.min(rect.width, left));
    right = Math.max(0, Math.min(rect.width, right));
    top = Math.max(0, Math.min(rect.height, top));
    bottom = Math.max(0, Math.min(rect.height, bottom));

    const cssW = right - left;
    const cssH = bottom - top;

    // If comp is fully off-screen, set an empty scissor.
    if (cssW <= 0 || cssH <= 0) {
      this.renderer.setScissor(0, 0, 0, 0);
      this.renderer.setScissorTest(true);
      this._compositionScissorActive = true;
      return;
    }

    // Convert CSS pixels to framebuffer pixels. Round INWARD on all edges
    // so the scissor is guaranteed to be AT OR INSIDE the composition edges.
    //
    // WebGL scissor uses (x, y, width, height) with y measured from the
    // BOTTOM of the framebuffer. CSS uses top-origin, so we flip Y.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const xLeftFB  = Math.ceil(left  * scaleX);
    const xRightFB = Math.floor(right * scaleX);
    const yBotFB   = Math.ceil((rect.height - bottom) * scaleY);  // top edge of comp in CSS = bottom edge in FB
    const yTopFB   = Math.floor((rect.height - top)    * scaleY);  // bottom edge of comp in CSS = top edge in FB

    const x = xLeftFB;
    const y = yBotFB;
    const w = Math.max(0, xRightFB - xLeftFB);
    const h = Math.max(0, yTopFB - yBotFB);

    if (w === 0 || h === 0) {
      this.renderer.setScissor(0, 0, 0, 0);
      this.renderer.setScissorTest(true);
      this._compositionScissorActive = true;
      return;
    }

    // ONLY set scissor. VIEWPORT stays at full canvas (untouched).
    this.renderer.setScissor(x, y, w, h);
    this.renderer.setScissorTest(true);
    this._compositionScissorActive = true;
  }

  /** Disable composition scissor and restore whole-canvas rendering. */
  private _disableCompositionScissor(): void {
    const canvas = this.renderer.domElement;
    this.renderer.setScissorTest(false);
    this.renderer.setScissor(0, 0, canvas.width, canvas.height);
    // DO NOT touch viewport here. Three.js sets it correctly on its own via
    // its internal render() calls. Changing it can desync from the camera's
    // projection matrix if the pixel ratio changes.
    this._compositionScissorActive = false;
  }

  /**
   * Apply camera to the 3D scene — two modes:
   *
   *   Free View:  bird's-eye orbiting camera (for scene arrangement)
   *   Active Camera:  through the composition's camera settings (FOV, orbit, pan)
   */
  private _applyPerspectiveCamera(comp: Composition): void {
    const isFree = !!(window as any).__freeViewMode;
    const camMode = comp.cameraMode ?? 'perspective';

    // Orthographic mode: use the regular 2D camera but allow 3D layer transforms
    if (camMode === 'orthographic') {
      this.scene3D.isActive = false;
      this.renderLoop.setCamera(this.cameraManager.camera);
      this.cameraManager.setCompositionSize(comp.width, comp.height);
      (window as any).__perspectiveActive = false;
      (window as any).__perspectiveCamera = null;
      return;
    }

    this.scene3D.isActive = true;
    const cam = this.scene3D.perspectiveCamera;

    // Set wide clip planes to prevent objects from disappearing at extreme angles
    cam.near = 0.1;
    cam.far = 50000;

    if (isFree) {
      // ── Free View: Blender-style orbit camera (focal point + yaw/pitch + distance) ──
      const yaw = (window as any).__freeOrbitY ?? 0.5;
      const pitch = (window as any).__freeOrbitX ?? 0.3;
      const dist = (window as any).__freeDistance ?? 500;
      const lookAtX = (window as any).__freeLookAtX ?? 0;
      const lookAtY = (window as any).__freeLookAtY ?? 0;
      const lookAtZ = (window as any).__freeLookAtZ ?? 0;

      cam.fov = 50;
      cam.aspect = this.cameraManager.viewportWidth / this.cameraManager.viewportHeight;

      // Camera position orbits around the focal point
      const camX = lookAtX + dist * Math.sin(yaw) * Math.cos(pitch);
      const camY = lookAtY + dist * Math.sin(pitch);
      const camZ = lookAtZ + dist * Math.cos(yaw) * Math.cos(pitch);

      cam.position.set(camX, camY, camZ);
      cam.lookAt(lookAtX, lookAtY, lookAtZ);

      // Sync legacy globals so other systems (scroll, WASD) stay consistent
      (window as any).__freeCamX = camX;
      (window as any).__freeCamY = camY;
      (window as any).__freeCamZ = camZ;
    } else {
      // ── Active Camera: use comp camera settings ──
      const fov = comp.cameraFOV ?? 50;
      const camZ = comp.cameraPositionZ ?? 1000;
      // FIX: use cameraRotationX/Y (written by CameraPanel + orbit handler)
      // NOT cameraOrbitX/Y (which were never set)
      const orbitX = comp.cameraRotationX ?? 0;
      const orbitY = comp.cameraRotationY ?? 0;
      const panX = comp.cameraPositionX ?? 0;
      const panY = comp.cameraPositionY ?? 0;

      cam.fov = fov;
      cam.aspect = this.cameraManager.viewportWidth / this.cameraManager.viewportHeight;

      const x = camZ * Math.sin(orbitY) * Math.cos(orbitX) + panX;
      const y = -camZ * Math.sin(orbitX) + panY;
      const z = camZ * Math.cos(orbitY) * Math.cos(orbitX);

      cam.position.set(x, y, z);
      cam.lookAt(panX, panY, 0);
    }

    cam.updateProjectionMatrix();
    this.cameraManager.setPerspectiveCamera(cam, this.renderer.domElement.width, this.renderer.domElement.height);
    this.renderLoop.setCamera(cam);

    // Expose camera for ModalTransform 3D-aware movement
    (window as any).__perspectiveActive = true;
    (window as any).__perspectiveCamera = cam;
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
    // Safety: ensure no leftover scissor from previous frames affects
    // nested offscreen FBO renders.
    this.renderer.setScissorTest(false);
    const canvas = this.renderer.domElement;
    this.renderer.setViewport(0, 0, canvas.width, canvas.height);
    this.renderer.setScissor(0, 0, canvas.width, canvas.height);

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
      nested.applyKeyframes(Math.floor(localFrame));
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

  // ── Video layer sync ─────────────────────────────────────────

  /** Sync volume/mute from layer data to video elements — always runs. */
  private _syncVideoAudio(comp: Composition): void {
    for (const layer of comp.layers) {
      if (layer.type !== 'video') continue;
      const r = this.layerSync.getRenderer(layer.id);
      if (!(r instanceof VideoLayerRenderer)) continue;
      const video = r.videoElement;
      if (!video) continue;
      const vdata = layer.data as VideoData | undefined;
      if (!vdata) continue;
      // If PropertyBinder has a volume override for this layer, use it
      const overrides = this.propertyBinder.overrides.get(layer.id);
      const targetVol = overrides?.volume != null ? overrides.volume : (vdata.volume ?? 1);
      const targetMuted = vdata.muted ?? false;
      if (Math.abs(video.volume - targetVol) > 0.01) video.volume = targetVol;
      if (video.muted !== targetMuted) video.muted = targetMuted;
    }
  }

  /** Sync video layer elements to the current composition time. */
  private _syncVideoLayers(comp: Composition, currentTime: number): void {
    const isPlaying = useTimelineStore.getState().playbackState === 'playing';
    const fps = comp.fps;
    const timeS = currentTime;

    for (const layer of comp.layers) {
      if (layer.type !== 'video') continue;
      const r = this.layerSync.getRenderer(layer.id);
      if (!(r instanceof VideoLayerRenderer)) continue;
      const video = r.videoElement;
      if (!video) continue;

      // Volume/mute handled by _syncVideoAudio (runs always)

      // Compute local time within the layer's visible range
      const layerStartSec = layer.startFrame / fps;
      const layerEndSec = layer.endFrame / fps;
      const inRange = timeS >= layerStartSec && timeS <= layerEndSec;

      if (isPlaying && inRange) {
        // Restore live VideoTexture if we were showing a cached frame
        r.restoreLiveTexture();

        // During playback: play video, seek to local time
        const vdata = layer.data as VideoData | undefined;
        const videoRate = vdata?.playbackRate ?? 1;
        if (video.playbackRate !== videoRate) video.playbackRate = videoRate;
        let localTime = (timeS - layerStartSec) * videoRate;

        // Apply Time Remapping if enabled
        if (vdata?.timeRemap && vdata?.timeRemapKeyframes?.length) {
          const sourceFrame = this._interpolateRemap(vdata.timeRemapKeyframes, Math.floor(timeS * fps));
          localTime = sourceFrame / fps;
        }

        if (Math.abs(video.currentTime - localTime) > 0.1) {
          video.currentTime = Math.max(0, Math.min(video.duration || Infinity, localTime));
        }
        if (video.paused) {
          video.play().catch((err) => {
            if (err?.name === 'NotAllowedError') {
              console.warn('[Video] Autoplay blocked — will unmute after first user interaction');
              video.muted = true;
              video.play().catch(() => {});
              this._setupVideoUnmuteOnGesture();
            } else {
              console.warn('[Video] Playback error:', err?.message ?? err);
            }
          });
        }
      } else {
        // Not playing or out of range: pause and show correct frame
        if (!video.paused) {
          video.pause();
        }
        if (inRange) {
          const vdata = layer.data as VideoData | undefined;
          let localTime = timeS - layerStartSec;

          // Apply Time Remapping if enabled
          if (vdata?.timeRemap && vdata?.timeRemapKeyframes?.length) {
            const sourceFrame = this._interpolateRemap(vdata.timeRemapKeyframes, Math.floor(timeS * fps));
            localTime = sourceFrame / fps;
          }
          const compFrame = Math.floor(timeS * fps);

          // Check video frame cache first for instant scrub display
          const cachedFrame = this.videoFrameCache.get(layer.id, compFrame);
          if (cachedFrame) {
            // Cache hit — use the cached bitmap for instant display
            r.setCachedBitmap(cachedFrame.imageBitmap);
          } else {
            // Cache miss — seek video and capture frame
            const needSeek = Math.abs(video.currentTime - localTime) > 0.01;
            if (needSeek) {
              video.currentTime = localTime;
            }

            const expectedTime = localTime;
            const doCapture = () => {
              if (Math.abs(video.currentTime - expectedTime) > 0.1) return;
              r.captureFrame().then((bitmap) => {
                if (!bitmap) return;
                this.videoFrameCache.store(layer.id, compFrame, bitmap);
                // Immediately display the captured frame so the viewport
                // updates on this scrub tick (no wait for next RAF).
                r.setCachedBitmap(bitmap);
              }).catch(() => {});
            };

            if (needSeek) {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                doCapture();
              };
              video.addEventListener('seeked', onSeeked, { once: true });
            } else {
              // Already at the right time but no cache — capture now.
              doCapture();
            }
          }
        }
      }
    }
  }

  /** Pause all video layers — called on playback pause/stop. */
  pauseAllVideos(): void {
    for (const [, r] of this.layerSync.getAllRenderers()) {
      if (r instanceof VideoLayerRenderer && r.videoElement) {
        r.videoElement.pause();
      }
    }
  }

  /** Sync audio layer elements to the current composition time. */  private _syncAudioLayers(comp: Composition, currentTime: number, isPlaying: boolean): void {
    const fps = comp.fps;
    // Remove orphaned audio renderers
    for (const [id, r] of this._audioRenderers) {
      if (!comp.layers.find(l => l.id === id)) {
        r.dispose();
        this._audioRenderers.delete(id);
      }
    }
    for (const layer of comp.layers) {
      if (layer.type !== 'audio') continue;
      let audioRenderer = this._audioRenderers.get(layer.id);
      if (!audioRenderer) {
        audioRenderer = new AudioLayerRenderer(layer.id);
        this._audioRenderers.set(layer.id, audioRenderer);
      }
      // If PropertyBinder has a volume override for this layer, apply it
      // so volume keyframes actually affect playback volume.
      const overrides = this.propertyBinder.overrides.get(layer.id);
      if (overrides?.volume != null) {
        const origData = layer.data as any;
        const patchedData = { ...origData, volume: overrides.volume };
        const patchedLayer = { ...layer, data: patchedData };
        audioRenderer.sync(patchedLayer, currentTime, fps, isPlaying);
      } else {
        audioRenderer.sync(layer, currentTime, fps, isPlaying);
      }
    }
  }

  /** Pause all audio layers — called on playback pause/stop. */
  pauseAllAudio(): void {
    for (const [, r] of this._audioRenderers) {
      r.pause();
    }
  }

  /** One-time user gesture handler to unmute videos after browser autoplay block */
  private _setupVideoUnmuteOnGesture(): void {
    const handler = () => {
      for (const [, r] of this.layerSync.getAllRenderers()) {
        if (r instanceof VideoLayerRenderer && r.videoElement) {
          r.videoElement.muted = false;
        }
      }
      document.removeEventListener('pointerdown', handler);
    };
    document.addEventListener('pointerdown', handler, { once: true });
  }

  /** Pause all audio on playback stop — called from PlaybackControls. */
  stopAllAudio(): void {
    for (const [, r] of this._audioRenderers) r.pause();
  }

  // ── Light layer sync ───────────────────────────────────────

  private _syncLightLayer(layer: any): void {
    const data = layer.lightData as LightData;
    if (!data) return;

    let lr = this._lightRenderers.get(layer.id);
    if (!lr) {
      lr = new LightLayerRenderer(layer.id, data);
      this._lightRenderers.set(layer.id, lr);
      this.sceneManager.scene.add(lr.group);
    }

    lr.updateData(data);
    if (layer.transform3D) {
      lr.updateTransform3D(layer.transform3D);
    }
    lr.setVisible(layer.visible && layer.is3D);
  }

private _syncModel3DLayer(layer: any): void {
  const data = layer.data as Model3DData;
  if (!data) return;

  let lr = this._model3dRenderers.get(layer.id);
  if (!lr) {
    lr = new Model3DLayerRenderer(layer.id, data.url ?? '');
    this._model3dRenderers.set(layer.id, lr);
    this.sceneManager.layerGroup.add(lr.group);
    // Load the model asynchronously
    this._loadModel3D(lr, data);
  }

  // Auto-rotate per frame
  if (lr && data.autoRotate) {
    lr.updateAutoRotate(performance.now(), data.autoRotateSpeed ?? 1);
  }
}

  private async _loadModel3D(lr: Model3DLayerRenderer, data: Model3DData): Promise<void> {
    try {
      const d = data as any;
      if (d.scene) {
        lr.setModel(d.scene);
      } else if (d.url) {
        const { loadModelFile } = await import('./layers/Model3DLoader');
        const resp = await fetch(d.url);
        const blob = await resp.blob();
        const file = new File([blob], d.fileName ?? 'model', { type: d.mimeType ?? 'model/gltf-binary' });
        const loaded = await loadModelFile(file);
        if (loaded.scene) {
          lr.setModel(loaded.scene);
        }
      }
      this.renderLoop.requestRender();
    } catch (err) {
      console.error('[Renderer] Failed to load 3D model:', err);
    }
  }

  // Cleanup light and model renderers on dispose
  /** Interpolate time remap keyframes to compute source frame from timeline frame */
  private _interpolateRemap(keyframes: Array<{time:number;sourceFrame:number}>, frame: number): number {
    if (!keyframes || keyframes.length === 0) return frame;
    if (keyframes.length === 1) return keyframes[0].sourceFrame;
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (frame <= sorted[0].time) return sorted[0].sourceFrame;
    if (frame >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].sourceFrame;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (frame >= sorted[i].time && frame <= sorted[i + 1].time) {
        const t = (frame - sorted[i].time) / (sorted[i + 1].time - sorted[i].time || 1);
        return Math.round(sorted[i].sourceFrame + t * (sorted[i + 1].sourceFrame - sorted[i].sourceFrame));
      }
    }
    return frame;
  }

  private _cleanupLightAndModelRenderers(): void {
    for (const [, r] of this._lightRenderers) {
      this.sceneManager.scene.remove(r.group);
      r.dispose();
    }
    this._lightRenderers.clear();
    for (const [, r] of this._model3dRenderers) {
      this.sceneManager.layerGroup.remove(r.group);
      r.dispose();
    }
    this._model3dRenderers.clear();
  }

  private _processEffects(): void {
    // Safety: ensure no leftover scissor from previous frames affects
    // our offscreen FBO renders. EffectsRenderer + EffectChain save/restore
    // but during interactive-mode pixel-ratio changes this can desync.
    this.renderer.setScissorTest(false);
    const canvas = this.renderer.domElement;
    this.renderer.setViewport(0, 0, canvas.width, canvas.height);
    this.renderer.setScissor(0, 0, canvas.width, canvas.height);

    const layerIds: string[] = [];
    const nameToId = new Map<string, string>();
    for (const child of this.sceneManager.layerGroup.children) {
      const r = this.layerSync.getRenderer(child.name);
      if (r) {
        layerIds.push(r.id);
        nameToId.set(child.name, r.id);
      }
    }

    this.effectsRenderer.prepareFrame(layerIds);

    let effectCount = 0;
    for (const child of this.sceneManager.layerGroup.children) {
      const id = nameToId.get(child.name);
      if (!id) continue;
      const r = this.layerSync.getRenderer(child.name);
      if (!r) continue;

      const gw = (r as any).geometryWidth?.() ?? 0;
      const gh = (r as any).geometryHeight?.() ?? 0;

      // Skip effects in Free View for performance — effects are 2D post-processing
      // that doesn't work correctly in the bird's-eye 3D view anyway.
      const isFreeView = !!(window as any).__freeViewMode;
      if (this.effectsRenderer.hasEffects(id) && gw > 0 && gh > 0 && !isFreeView) {
        try {
          // Try to render with effects — if it succeeds, hide original mesh
          const success = this.effectsRenderer.renderLayer(id, r.mesh, gw, gh, r.group);
          if (success) {
            this._toggleOriginalMesh(r, false);
            effectCount++;
          } else {
            // Never leave the original hidden if effect rendering fails.
            this.effectsRenderer.removeLayerEffects(id);
            this._toggleOriginalMesh(r, true);
          }
        } catch (err) {
          console.warn(`[Effects] renderLayer error for ${id}:`, err);
          this.effectsRenderer.removeLayerEffects(id);
          this._toggleOriginalMesh(r, true);
        }
      } else {
        // No effects or zero-size geometry — show original mesh
        this._toggleOriginalMesh(r, true);
        // Clean up any stale effect quads
        this.effectsRenderer.removeLayerEffects(id);
      }
    }

    if (effectCount > 0) {
      this.renderLoop.requestRender();
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

    // Cache builds must render the full comp — never inherit the viewer scissor.
    this._disableCompositionScissor();

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

    // Adjustment layers: composite everything-below through their effect chains.
    // Needed here so both RAM preview builds AND transition FBO captures
    // correctly include adjustment layer effects.
    this.adjustmentCompositor.prepareFrame(comp.layers, comp.width, comp.height, frame);
    if (this.adjustmentCompositor.hasActiveAdjustments) {
      for (const layer of comp.layers) {
        if (layer.type !== 'adjustment') continue;
        const r = this.layerSync.getRenderer(layer.id);
        if (r instanceof AdjustmentLayerRenderer) {
          r.setCompSize(comp.width, comp.height);
        }
      }
      this.adjustmentCompositor.execute(comp.layers, comp.width, comp.height);
    }

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
    // Scissor is a viewer-only concern. Force disable for synchronous cache render.
    this._disableCompositionScissor();
    // Use the renderLoop's camera (perspective in 3D mode, ortho in 2D)
    this.renderer.render(this.sceneManager.scene, this.renderLoop.getCamera());
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

  /**
   * Render a preview through the composition's perspective camera (not the
   * free-orbit camera) and draw it onto a target canvas.
   *
   * Used by CameraPreview when in Free View so the thumbnail shows what
   * the actual composition camera sees, not the bird's-eye orbit view.
   */
  renderCameraPreview(targetCanvas: HTMLCanvasElement): void {
    const comp = this._composition;
    if (!comp || !comp.perspective3D) return;

    const pw = targetCanvas.width;
    const ph = targetCanvas.height;
    if (pw === 0 || ph === 0) return;

    // Build camera — use camera layer transform if present, else comp-level settings
    const cameraLayer = comp.layers.find(l => l.type === 'camera' && l.visible !== false);
    const cam = new THREE.PerspectiveCamera(comp.cameraFOV ?? 50, comp.width / comp.height, 0.1, 50000);

    if (cameraLayer && cameraLayer.transform3D) {
      const t3d = cameraLayer.transform3D;
      const cd = cameraLayer.cameraData;
      cam.fov = cd?.focalLength
        ? 2 * Math.atan(36 / (2 * cd.focalLength)) * (180 / Math.PI)
        : (comp.cameraFOV ?? 50);
      cam.position.set(t3d.position.x, t3d.position.y, -t3d.position.z);
      // lookAt overrides rotation — no need to set rotation explicitly
      const poi = cd?.pointOfInterest ?? { x: 0, y: 0, z: 0 };
      cam.lookAt(poi.x, poi.y, poi.z);
    } else {
      const camZ = comp.cameraPositionZ ?? 1000;
      const orbitX = comp.cameraRotationX ?? 0;
      const orbitY = comp.cameraRotationY ?? 0;
      const panX = comp.cameraPositionX ?? 0;
      const panY = comp.cameraPositionY ?? 0;
      cam.position.set(
        camZ * Math.sin(orbitY) * Math.cos(orbitX) + panX,
        -camZ * Math.sin(orbitX) + panY,
        camZ * Math.cos(orbitY) * Math.cos(orbitX),
      );
      cam.lookAt(panX, panY, 0);
    }
    cam.updateProjectionMatrix();

    // Reuse cached FBO (avoid alloc/dispose every frame at 15fps)
    if (!this._previewFBO || this._previewFBOSize.w !== pw || this._previewFBOSize.h !== ph) {
      this._previewFBO?.dispose();
      this._previewFBO = new THREE.WebGLRenderTarget(pw, ph, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false,
      });
      this._previewFBOSize = { w: pw, h: ph };
    }

    const prevTarget = this.renderer.getRenderTarget();
    const prevScissorTest = this.renderer.getScissorTest();

    this.renderer.setRenderTarget(this._previewFBO);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, pw, ph);
    this.renderer.setClearColor(new THREE.Color(comp.backgroundColor ?? '#000000'), 1);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.sceneManager.scene, cam);

    // Read FBO pixels → targetCanvas using Three.js API (more reliable than raw gl.readPixels)
    const pixelBuffer = new Uint8Array(pw * ph * 4);
    try {
      this.renderer.readRenderTargetPixels(this._previewFBO, 0, 0, pw, ph, pixelBuffer);
    } catch {
      // Fallback: raw gl.readPixels if readRenderTargetPixels fails
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl) {
        gl.finish();
        gl.readPixels(0, 0, pw, ph, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
      }
    }

    // Copy to 2D canvas (flip Y because WebGL is bottom-up)
    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(pw, ph);
      const rowBytes = pw * 4;
      for (let y = 0; y < ph; y++) {
        imgData.data.set(pixelBuffer.subarray(y * rowBytes, y * rowBytes + rowBytes), (ph - 1 - y) * rowBytes);
      }
      ctx.putImageData(imgData, 0, 0);
    }

    this.renderer.setViewport(0, 0, this.renderer.domElement.width, this.renderer.domElement.height);
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setScissorTest(prevScissorTest);
  }

  // ── Transition compositing ────────────────────────────────────

  /** Ensure transition FBOs exist and match the current canvas size. */
  private _ensureTransitionFBOs(width: number, height: number): void {
    const needs = (fbo: THREE.WebGLRenderTarget | null) =>
      !fbo || fbo.width !== width || fbo.height !== height;

    const fboOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    };

    if (needs(this._transitionFBO_A)) {
      this._transitionFBO_A?.dispose();
      this._transitionFBO_A = new THREE.WebGLRenderTarget(width, height, fboOptions);
    }
    if (needs(this._transitionFBO_B)) {
      this._transitionFBO_B?.dispose();
      this._transitionFBO_B = new THREE.WebGLRenderTarget(width, height, fboOptions);
    }
    if (needs(this._transitionFBO_Accumulated)) {
      this._transitionFBO_Accumulated?.dispose();
      this._transitionFBO_Accumulated = new THREE.WebGLRenderTarget(width, height, fboOptions);
    }
  }

  /**
   * Render stacked transitions via chain blending.
   * For N transitions, renders N+1 capture frames and chain-blends:
   *   FBO_A (T0 start) → blend(T0) → FBO_Accum
   *   FBO_B (T1 end)   → blend(T1, FBO_Accum → FBO_B) → FBO_Accum
   *   ...
   *   Final → canvas
   * Called from onFrame AFTER the normal scene has rendered.
   */
  private _executeTransitions(transitions: NonNullable<Renderer['_activeTransitions']>): void {
    // Grab comp from the store at current time (not from a stale reference)
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
      : null;
    if (!comp || transitions.length === 0) return;

    const fps = comp.fps;
    const canvas = this.renderer.domElement;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    this._ensureTransitionFBOs(w, h);

    // Save current state
    const savedOverride = this._cacheRenderTimeOverride;
    const savedTarget = this.renderer.getRenderTarget();

    try {
      this._disableCompositionScissor();

      // Helper: set scene state for a given frame and render to an FBO
      const renderAtFrame = (frame: number, target: THREE.WebGLRenderTarget) => {
        this._cacheRenderTimeOverride = frame / fps;
        this.runBeforeRenderHooks();
        for (const id of this._transitionLayerIds) {
          const r = this.layerSync.getRenderer(id);
          if (r) r.setVisible(false);
        }
        this.renderer.setRenderTarget(target);
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissorTest(false);
        this.renderer.clear(true, true, true);
        this.renderer.render(this.sceneManager.scene, this.renderLoop.getCamera());
      };

      // Collect unique capture frames: T0.start + every T.end
      const captureFrames = new Set<number>();
      captureFrames.add(transitions[0].startFrame);
      for (const t of transitions) captureFrames.add(t.endFrame);
      const frameList = Array.from(captureFrames).sort((a, b) => a - b);

      // Render each unique capture frame to FBOs (A and B, ping-pong)
      // Store results in a map for the chain loop below
      const texCache = new Map<number, THREE.Texture>();
      for (let i = 0; i < frameList.length; i++) {
        const f = frameList[i];
        const target = i % 2 === 0 ? this._transitionFBO_A! : this._transitionFBO_B!;
        renderAtFrame(f, target);
        texCache.set(f, target.texture);
      }

      // Chain-blend transitions in order
      // accum starts as the scene at T0.startFrame
      let accumTex = texCache.get(transitions[0].startFrame)!;

      for (let i = 0; i < transitions.length; i++) {
        const t = transitions[i];
        const nextTex = texCache.get(t.endFrame)!;

        if (i === transitions.length - 1) {
          // Last transition: blend directly to canvas
          this.renderer.setRenderTarget(null);
          this.renderer.setViewport(0, 0, w, h);
          this.renderer.setScissorTest(false);
          this.renderer.setClearColor(0, 0);
          this.renderer.clear(true, true, true);

          this.transitionCompositor.apply(
            t.transitionId,
            t.params,
            t.progress,
            accumTex,
            nextTex,
            null as any,
            w,
            h,
          );
        } else {
          // Intermediate blend: write to accumulated FBO
          this.renderer.setRenderTarget(this._transitionFBO_Accumulated!);
          this.renderer.setViewport(0, 0, w, h);
          this.renderer.setScissorTest(false);
          this.renderer.clear(true, true, true);

          this.transitionCompositor.apply(
            t.transitionId,
            t.params,
            t.progress,
            accumTex,
            nextTex,
            this._transitionFBO_Accumulated!,
            w,
            h,
          );
          // Accumulated result becomes the base for next transition
          accumTex = this._transitionFBO_Accumulated!.texture;
        }
      }
    } catch (err) {
      console.warn('[Renderer] Transitions error:', err);
    } finally {
      this._cacheRenderTimeOverride = savedOverride;
      this.renderer.setRenderTarget(savedTarget);
    }
  }

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
    // Canvas stores raw framebuffer bytes (sRGB-encoded from readPixels).
    // SRGBColorSpace tells the hardware to decode sRGB→linear on read,
    // which is undone by the renderer's linear→sRGB output — correct round-trip.
    this._cachedFrameTex.colorSpace = THREE.SRGBColorSpace;
    // Keep default SRGBColorSpace.  The canvas stores raw framebuffer
    // bytes (sRGB-encoded from readPixels).  SRGBColorSpace tells the
    // hardware to decode sRGB→linear on read, which is undone by the
    // renderer's linear→sRGB output — a correct round-trip.

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
    this._cleanupLightAndModelRenderers();
    this.sceneManager.dispose();
    this.cameraManager.dispose();
    this.layerSync.clear();
    this.effectsRenderer.dispose();
    this.adjustmentCompositor.dispose();
    this.motionBlurCompositor.dispose();
    this.transitionCompositor.dispose();
    this.selectionOverlay.dispose();

    if (this._interactiveHandler) {
      document.removeEventListener('renderer:interactive', this._interactiveHandler);
    }
    if (this._viewModeHandler) {
      document.removeEventListener('viewport:viewmode', this._viewModeHandler);
      this._viewModeHandler = null;
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
    this.videoFrameCache.dispose();
    this.renderScheduler.dispose();
    this.adaptiveResolution.dispose();
    this.perfMonitor.dispose();
    this.frameDiskCache.dispose();
    this.frameCache.dispose();
    for (const r of this._audioRenderers.values()) r.dispose();
    this._audioRenderers.clear();

    this._transitionFBO_A?.dispose();
    this._transitionFBO_A = null;
    this._transitionFBO_B?.dispose();
    this._transitionFBO_B = null;
    this._transitionFBO_Accumulated?.dispose();
    this._transitionFBO_Accumulated = null;

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