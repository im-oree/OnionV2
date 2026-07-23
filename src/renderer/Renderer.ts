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
import { useViewportStore } from '../state/viewportStore';
import { TOOLS } from '../config/constants';
import type { Composition } from '../types/composition';
import type { CompData, VideoData, TransitionData } from '../types/layer';
import { computeFadeEnvelope } from './audio/audioEnvelope';
import { getActiveSegment } from '../types/layer';
import { VideoLayerRenderer } from './layers/VideoLayerRenderer';
import { AudioLayerRenderer } from './layers/AudioLayerRenderer';
import { AdjustmentCompositor } from './compositing/AdjustmentCompositor';
import { AdjustmentLayerRenderer } from './layers/AdjustmentLayerRenderer';
import { MotionBlurCompositor } from './compositing/MotionBlurCompositor';
import { TransitionCompositor } from './transitions/TransitionCompositor';
import { TonemapPass, type TonemapMode } from './compositing/TonemapPass';
import { getTransitionById } from './transitions/library';
import { preProcessManager } from './PreProcessManager';
import { Scene3DManager } from './Scene3DManager';
import { ModifierEngine } from './ModifierEngine';
import { LightLayerRenderer } from './layers/LightLayerRenderer';
import { Model3DLayerRenderer } from './layers/Model3DLayerRenderer';
import type { LightData } from '../types/layer';
import type { Model3DData } from '../types/model3d';
import { frameCache } from './cache/FrameCache';
import { scrubPrewarmer } from './ScrubPrewarmer';

export interface RendererState {
  fps: number;
  zoom: number;
  frameCount: number;
  quality?: string;
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

  public readonly renderScheduler: RenderScheduler;
  public readonly perfMonitor: PerfMonitor;
  public readonly gpuTextureCache: GPUTextureCache;
  public readonly videoFrameCache: VideoFrameCache;
  public readonly propertyBinder: PropertyBinder;
  public readonly motionBlurCompositor: MotionBlurCompositor;
  public readonly texturePreloader: TexturePreloader;
  public readonly transitionCompositor: TransitionCompositor;
  public readonly tonemapPass: TonemapPass;
  public readonly scene3D: Scene3DManager;

  private _state: RendererState = { fps: 0, zoom: 1, frameCount: 0 };
  private _onStateChange?: (state: RendererState) => void;
  private _composition: Composition | null = null;
  private _captureCanvas: HTMLCanvasElement | null = null;
  private _interactiveHandler: ((e: Event) => void) | null = null;
  private _viewModeHandler: ((e: Event) => void) | null = null;
  private _toolUnsubscribe: (() => void) | null = null;
  private _kfUnsub: (() => void) | null = null;
  private _compStoreUnsub: (() => void) | null = null;

  // ── Frame cache state ──────────────────────────────────────
  private _cacheWorker: Worker | null = null;
  /** Hash of the last frame we rendered or served from cache */
  private _lastFrameHash: string = '';
  /** When true the current frame was served from RAM cache — skip 3D render */
  private _cacheHitThisFrame = false;
  /** Pending async disk-cache read for the current hash */
  private _pendingCacheRead: Promise<void> | null = null;


  /** AE-style viewer clipping */
  private _clipToCompBounds = true;
  private _compositionScissorActive = false;

  private _nestedRenderers = new Map<string, NestedCompRenderer>();
  private _audioRenderers = new Map<string, AudioLayerRenderer>();
  private _lightRenderers = new Map<string, LightLayerRenderer>();
  public readonly adjustmentCompositor: AdjustmentCompositor;

  private _activeTransitions: Array<{
    layerId: string;
    transitionId: string;
    params: Record<string, number | string | boolean>;
    progress: number;
    startFrame: number;
    endFrame: number;
  }> | null = null;

  private _transitionFBO_A: THREE.WebGLRenderTarget | null = null;
  private _transitionFBO_B: THREE.WebGLRenderTarget | null = null;
  private _transitionFBO_Accumulated: THREE.WebGLRenderTarget | null = null;
  private _transitionLayerIds: string[] = [];
  private _previewFBO: THREE.WebGLRenderTarget | null = null;
  private _previewFBOSize = { w: 0, h: 0 };

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
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

    this.renderScheduler = new RenderScheduler();
    this.renderScheduler.onRequestRender = () => this.renderLoop.requestRender();
    this.gpuTextureCache = new GPUTextureCache();
    this.videoFrameCache = new VideoFrameCache();

    // ── Wire disk cache worker ──────────────────────────────
    try {
      const cacheWorkerUrl = new URL('../workers/cacheWorker.ts', import.meta.url);
      this._cacheWorker = new Worker(cacheWorkerUrl, { type: 'module' });
      frameCache.disk.attachWorker(this._cacheWorker);
    } catch (err) {
      console.warn('[Renderer] Cache worker unavailable:', err);
    }

    (window as any).__frameCache = frameCache;

    this.propertyBinder = new PropertyBinder(useKeyframeStore.getState().engine);
    this.motionBlurCompositor = new MotionBlurCompositor(this.renderer, this.layerSync);
    this.transitionCompositor = new TransitionCompositor(this.renderer);
    this.tonemapPass = new TonemapPass(this.renderer);
    this.texturePreloader = new TexturePreloader();
    this.scene3D = new Scene3DManager();
    this.scene3D.setRenderer(this.renderer);
    this._previewFBO = null;

    let _lastKfRevision = useKeyframeStore.getState().revision;
    this._kfUnsub = useKeyframeStore.subscribe((state) => {
      if (state.revision === _lastKfRevision) return;
      _lastKfRevision = state.revision;
      // Keyframe changed → bust cache for the active comp
      this._invalidateActiveCompCache();
      this.renderLoop.requestRender();
    });

    this.perfMonitor = new PerfMonitor();

    (window as any).__perfMonitor = this.perfMonitor;
    (window as any).__resourceRegistry = resourceRegistry;
    (window as any).__renderer = this;
    (window as any).__gpuTextureCache = this.gpuTextureCache;
    (window as any).__videoFrameCache = this.videoFrameCache;

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
    this.cameraManager.onChanged = () => this.renderScheduler.request();

    this._interactiveHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.renderLoop.setInteractive(!!detail?.on);
    };
    document.addEventListener('renderer:interactive', this._interactiveHandler);

    (window as any).__freeViewMode = false;
    (window as any).__freeOrbitX = 0.2;
    (window as any).__freeOrbitY = 0.8;
    (window as any).__freeDistance = 800;
    (window as any).__freeLookAtX = 0;
    (window as any).__freeLookAtY = 0;
    (window as any).__freeLookAtZ = 0;
    this._viewModeHandler = ((e: Event) => {
      const detail = (e as CustomEvent).detail;
      (window as any).__freeViewMode = !!detail?.free;
      const comp = this._composition;
      if (!comp) return;
      this._applyPerspectiveCamera(comp);
      this.renderLoop.requestRender();
    }) as EventListener;
    document.addEventListener('viewport:viewmode', this._viewModeHandler);

    this.renderLoop.onFrameDropped = () => {
      this.renderScheduler.recordDroppedFrame();
      this.perfMonitor.recordDroppedFrame();
    };

    // ── Auto-invalidation: watch compositionStore for layer changes ──
    this._setupAutoInvalidation();

    let renderStart = 0;

    // ── beforeRender: check frame cache ───────────────────────
    this.renderLoop.beforeRender = () => {
      renderStart = performance.now();
      this._cacheHitThisFrame = false;

      const cs = useCompositionStore.getState();
      const comp = cs.activeCompositionId
        ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
        : null;
      if (!comp) {
        this._disableCompositionScissor();
        return;
      }

      const effectiveTime = comp.currentTime;
      const frame = Math.floor(effectiveTime * comp.fps);
      const playbackState = useTimelineStore.getState().playbackState;
      const isPlaying = playbackState === 'playing';

      // ⚠ FAST PATH: During playback, completely bypass the cache system.
      // No hashing, no cache lookup, no disk read — just render.
      // This is critical for playback smoothness; hashing every layer per
      // frame + async promise chains steal too much frame budget.
      if (!isPlaying && !ModalTransform.activeAnywhere) {
        const hash = frameCache.hashFor(comp, frame);

        // Same frame as last render → skip entirely
        if (hash === this._lastFrameHash && frameCache.ram.has(hash)) {
          this._cacheHitThisFrame = true;
          return;
        }

        // New frame → try RAM
        if (hash !== this._lastFrameHash) {
          const ramEntry = frameCache.ram.get(hash);
          if (ramEntry) {
            frameCache.blitToCanvas(ramEntry.data, this.renderer.domElement);
            this._lastFrameHash = hash;
            this._cacheHitThisFrame = true;
            return;
          }
          // Disk read (async, non-blocking)
          this._pendingCacheRead = frameCache.get(hash).then((diskHit) => {
            if (diskHit && !frameCache.ram.has(hash)) {
              frameCache.ram.set(hash, diskHit, comp.id, frame);
              this.renderLoop.requestRender();
            }
            this._pendingCacheRead = null;
          }).catch(() => { this._pendingCacheRead = null; });
        }

        scrubPrewarmer.cancel();
      }

      // Hide any cache overlay so the WebGL canvas is visible again
      frameCache.hideOverlay();

      const bgColor = comp.backgroundColor ?? '#000000';
      const bgHex = parseInt(bgColor.replace('#', '0x'), 16);
      {
        const oldTarget = this.renderer.getRenderTarget();
        const oldClearColor = new THREE.Color();
        this.renderer.getClearColor(oldClearColor);
        const oldClearAlpha = this.renderer.getClearAlpha();
        this.renderer.setRenderTarget(null);

        this.renderer.setScissorTest(false);
        const { w: lw, h: lh } = this._getLogicalSize();
        this.renderer.setScissor(0, 0, lw, lh);
        this.renderer.setViewport(0, 0, lw, lh);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear(true, true, true);

        if (!comp.perspective3D) {
          this._applyCompositionScissor(comp);
          if (this._compositionScissorActive) {
            this.renderer.setClearColor(bgHex, 1);
            this.renderer.clear(true, true, true);
          }
        } else {
          this.renderer.setClearColor(bgHex, 1);
          this.renderer.clear(true, true, true);
        }

        this.renderer.setClearColor(oldClearColor, oldClearAlpha);
        this.renderer.setRenderTarget(oldTarget);
      }

      this.tonemapPass.mode = (comp.tonemapMode ?? 0) as TonemapMode;
      {
        const canvas = this.renderer.domElement;
        this.tonemapPass.beforeRender(canvas.width, canvas.height, bgHex, 1);
      }

      this._syncVideoAudio(comp);

      this.texturePreloader.isPlaying = isPlaying;
      this.texturePreloader.update(comp, frame);

      if (playbackState !== 'stopped') {
        this._syncVideoLayers(comp, effectiveTime);
      }

      this._syncAudioLayers(comp, effectiveTime, isPlaying);

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

      if (comp.motionBlur?.enabled && !ModalTransform.activeAnywhere) {
        this.motionBlurCompositor.apply(comp, this.sceneManager.scene, this.cameraManager.camera as any, frame);
      }

      if (comp.perspective3D) {
        this._applyPerspectiveCamera(comp);
      } else {
        this.scene3D.isActive = false;
        this.cameraManager.setPerspectiveCamera(null);
        this.renderLoop.setCamera(this.cameraManager.camera);
        (window as any).__perspectiveActive = false;
        (window as any).__perspectiveCamera = null;
      }

      for (const id of this._transitionLayerIds) {
        const r = this.layerSync.getRenderer(id);
        if (r) r.setVisible(false);
      }

      this.scene3D.setupDefaultLights(this.sceneManager.scene);
      this.scene3D.syncLights(comp.layers, this.sceneManager.scene);

      const overridesActive = this.layerSync.isRuntimeOverridesActive;
      for (const layer of comp.layers) {
        const layerRenderer = this.layerSync.getRenderer(layer.id);
        if (layerRenderer) {
          const hasOverride = overridesActive && this.propertyBinder.overrides.has(layer.id);
          if (!hasOverride) {
            const modifiedTransform = ModifierEngine.apply(layer, effectiveTime);
            layerRenderer.updateTransform(modifiedTransform);
          }
          if (layer.is3D && layer.transform3D) {
            layerRenderer.updateTransform3D(layer.transform3D);
          }
        }
        if (layer.type === 'light') {
          this._syncLightLayer(layer);
        }
        if (layer.type === 'model3d' && layer.is3D) {
          this._syncModel3DLayer(layer);
        }
      }

      this.layerSync.recomputeWorldTransforms(comp.layers);

      if (!comp.perspective3D) {
        this._applyCompositionScissor(comp);
      } else {
        this._disableCompositionScissor();
      }
    };

    // ── afterRender: capture frame to cache (SCRUB ONLY) ───────
    this.renderLoop.afterRender = () => {
      this.tonemapPass.afterRender();

      // Skip capture if this frame was a cache hit (no render happened)
      if (this._cacheHitThisFrame) return;

      // ⚠ CRITICAL: Never capture during playback.
      // readPixels() stalls the GPU pipeline and destroys playback smoothness.
      // Playback frames are captured only via explicit RAM Preview builds.
      const isPlaying = useTimelineStore.getState().playbackState === 'playing';
      if (isPlaying) return;

      // Never capture during interactive transforms (transient state)
      if (ModalTransform.activeAnywhere) return;

      // Never capture during transitions
      if (this._activeTransitions && this._activeTransitions.length > 0) return;

      const cs = useCompositionStore.getState();
      const comp = cs.activeCompositionId
        ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
        : null;
      if (!comp) return;

      const effectiveTime = comp.currentTime;
      const frame = Math.floor(effectiveTime * comp.fps);
      const hash = frameCache.hashFor(comp, frame);

      // Skip if already cached
      if (frameCache.ram.has(hash)) {
        this._lastFrameHash = hash;
        return;
      }

      // Capture (safe — we're not playing)
      const captured = frameCache.captureFromRenderer(
        this.renderer,
        hash,
        comp.id,
        frame,
      );
      if (captured) {
        this._lastFrameHash = hash;
      }
    };

    this.renderLoop.onFrame = (stats: FrameStats) => {
      // If this was a pure cache-hit frame, skip the heavy post-frame work
      // (visibility restore, adjustment restore, etc.) since nothing rendered.
      if (!this._cacheHitThisFrame) {
        this._disableCompositionScissor();

        const cs2 = useCompositionStore.getState();
        const activeComp = cs2.activeCompositionId
          ? cs2.compositions.find((c) => c.id === cs2.activeCompositionId)
          : null;
        if (activeComp) {
          const restoreFrame = Math.floor(activeComp.currentTime * activeComp.fps);
          this.adjustmentCompositor.restoreVisibility(activeComp.layers, restoreFrame);
          if (activeComp.motionBlur?.enabled) {
            this.motionBlurCompositor.restore(activeComp, this.sceneManager.scene);
          }
        }

        if (this._activeTransitions) {
          this._executeTransitions(this._activeTransitions);
          this._activeTransitions = null;
        }
      }

      const vp = this.cameraManager.getViewportTransform();
      const budget = this.renderScheduler.getBudget();
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
        droppedFrames: budget.droppedFrames,
        gpuMemoryMB: gpuMB,
        gpuMemoryBudgetMB: gpuBudgetMB,
      };

      this._onStateChange?.(this._state);
    };

    this.resizeHandler.observe(container);

    this.resizeHandler.setCallback((_w: number, _h: number) => {
      const comp = this._composition;
      if (comp?.perspective3D) {
        const cam = this.scene3D.perspectiveCamera;
        cam.aspect = this.cameraManager.viewportWidth / this.cameraManager.viewportHeight;
        cam.updateProjectionMatrix();
        this.renderLoop.requestRender();
      }
      // Canvas resized → cached pixels are wrong resolution, bust cache
      this._invalidateActiveCompCache();
    });

    this.renderLoop.start();

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

  // ── Auto-invalidation ──────────────────────────────────────────

  /**
   * Subscribe to compositionStore. When a layer is updated, invalidate
   * that layer's frame range from the RAM cache. We use a shallow
   * comparison on layers arrays — if the reference changed, something edited.
   *
   * We track layer state by a fast fingerprint (JSON of layer ids + their
   * transform/effects hashes) rather than deep-comparing every property.
   */
  private _setupAutoInvalidation(): void {
    const _layerFingerprints = new Map<string, Map<string, string>>();

    this._compStoreUnsub = useCompositionStore.subscribe((state, prevState) => {
      // ⚠ CRITICAL: Skip invalidation entirely during playback.
      // PropertyBinder mutates runtime state via setCurrentTimeSilent which
      // shouldn't fire subscribers, but any real change during playback is
      // transient (keyframe interpolation) and MUST NOT bust the cache.
      const isPlaying = useTimelineStore.getState().playbackState === 'playing';
      if (isPlaying) return;

      // Also skip during interactive transforms — the confirm() will fire
      // a final store update that we DO want to process.
      if (ModalTransform.activeAnywhere) return;

      for (const comp of state.compositions) {
        const prev = prevState.compositions.find(c => c.id === comp.id);
        if (!prev) continue;

        // Fastest path: if the layers array reference is unchanged,
        // nothing about layers changed (currentTime updates keep same ref)
        if (prev.layers === comp.layers) continue;

        // Layers array changed — but did any layer's RENDERING state change?
        const prevFingerprints = _layerFingerprints.get(comp.id) ?? new Map<string, string>();
        const nextFingerprints = new Map<string, string>();
        const invalidatedRanges: Array<{ start: number; end: number }> = [];

        for (const layer of comp.layers) {
          const fp = this._layerFingerprint(layer);
          nextFingerprints.set(layer.id, fp);

          const prevFp = prevFingerprints.get(layer.id);
          if (prevFp === undefined) {
            // New layer added — cache range invalid where it appears
            invalidatedRanges.push({ start: layer.startFrame, end: layer.endFrame });
            continue;
          }
          if (prevFp !== fp) {
            // Actual rendering-affecting change
            invalidatedRanges.push({ start: layer.startFrame, end: layer.endFrame });
          }
        }

        // Check for removed layers
        let hadRemoval = false;
        for (const [id] of prevFingerprints) {
          if (!comp.layers.find(l => l.id === id)) {
            hadRemoval = true;
            break;
          }
        }

        _layerFingerprints.set(comp.id, nextFingerprints);

        if (hadRemoval) {
          // Can't know the removed layer's range — nuke whole comp
          frameCache.ram.invalidateComp(comp.id);
          this._lastFrameHash = '';
          frameCache.hideOverlay();
        } else if (invalidatedRanges.length > 0) {
          // Merge overlapping ranges and invalidate
          for (const r of invalidatedRanges) {
            frameCache.ram.invalidateRange(comp.id, r.start, r.end);
          }
          this._lastFrameHash = '';
          frameCache.hideOverlay();
        }
      }
    });
  }

  /**
   * Build a short fingerprint string from layer rendering-relevant state.
   * Must be fast — called on every compositionStore update.
   * We intentionally exclude currentTime (not a layer property).
   */
  private _layerFingerprint(layer: import('../types/layer').Layer): string {
    const t = layer.transform;
    const e = layer.effects;
    return [
      layer.visible ? '1' : '0',
      layer.opacity,
      layer.blendMode,
      layer.startFrame,
      layer.endFrame,
      t ? `${t.x?.toFixed(1)},${t.y?.toFixed(1)},${t.scaleX?.toFixed(2)},${t.scaleY?.toFixed(2)},${t.rotation?.toFixed(2)}` : '',
      e ? e.map(fx => `${fx.effectId}:${fx.enabled}`).join('|') : '',
      // For image/video layers, include the source url so asset swaps bust cache
      (layer.data as any)?.url ?? '',
      (layer.data as any)?.sourceCompId ?? '',
    ].join(';');
  }

  /** Invalidate RAM cache for the currently active composition */
  private _invalidateActiveCompCache(): void {
    const cs = useCompositionStore.getState();
    if (cs.activeCompositionId) {
      frameCache.ram.invalidateComp(cs.activeCompositionId);
      this._lastFrameHash = '';
    }
  }

  // ── Composition ────────────────────────────────────────────────

  applyComposition(comp: Composition): void {
    const prev = this._composition;
    const changedSize =
      !prev || prev.width !== comp.width || prev.height !== comp.height;

    if (prev && prev.id !== comp.id) {
      this.gpuTextureCache.invalidateAll(prev.id);
      frameCache.invalidateComp(prev.id).catch(() => {});
    }

    this._composition = comp;

    this.sceneManager.applyComposition(
      comp.width,
      comp.height,
      comp.backgroundColor,
      !!comp.perspective3D || comp.layers.some(l => l.is3D || l.type === 'camera' || l.type === 'light'),
    );

    this.sceneManager.updateBackgroundColor(comp.backgroundColor ?? '#000000');

    if (changedSize) {
      this.cameraManager.setCompositionSize(comp.width, comp.height);
      this._previewFBO?.dispose();
      this._previewFBO = null;
      // Size changed → all cached frames are wrong dimensions
      frameCache.ram.invalidateComp(comp.id);
      this._lastFrameHash = '';
    }

    this.renderLoop.setTargetFps(comp.fps);
    this.renderScheduler.setFrameBudget(comp.fps);
    this.perfMonitor.setTargetFps(comp.fps);

    this.renderLoop.render();
    this.renderLoop.requestRender();
  }

  get composition(): Composition | null { return this._composition; }

  setClipToCompositionBounds(enabled: boolean): void {
    this._clipToCompBounds = enabled;
    if (!enabled) this._disableCompositionScissor();
    this.renderLoop.requestRender();
  }

  get clipToCompositionBounds(): boolean {
    return this._clipToCompBounds;
  }

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

    left   = Math.max(0, Math.min(rect.width,  left));
    right  = Math.max(0, Math.min(rect.width,  right));
    top    = Math.max(0, Math.min(rect.height, top));
    bottom = Math.max(0, Math.min(rect.height, bottom));

    const cssW = right - left;
    const cssH = bottom - top;

    if (cssW <= 0 || cssH <= 0) {
      this.renderer.setScissor(0, 0, 0, 0);
      this.renderer.setScissorTest(true);
      this._compositionScissorActive = true;
      return;
    }

    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;

    const xLeftFB  = Math.ceil(left   * scaleX);
    const xRightFB = Math.floor(right  * scaleX);
    const yBotFB   = Math.ceil((rect.height - bottom) * scaleY);
    const yTopFB   = Math.floor((rect.height - top)   * scaleY);

    const x = xLeftFB;
    const y = yBotFB;
    const w = Math.max(0, xRightFB - xLeftFB);
    const h = Math.max(0, yTopFB   - yBotFB);

    if (w === 0 || h === 0) {
      this.renderer.setScissor(0, 0, 0, 0);
      this.renderer.setScissorTest(true);
      this._compositionScissorActive = true;
      return;
    }

    this.renderer.setScissor(x, y, w, h);
    this.renderer.setScissorTest(true);
    this._compositionScissorActive = true;
  }

  private _disableCompositionScissor(): void {
    const { w: lw, h: lh } = this._getLogicalSize();
    this.renderer.setScissorTest(false);
    this.renderer.setScissor(0, 0, lw, lh);
    this._compositionScissorActive = false;
  }

  private _applyPerspectiveCamera(comp: Composition): void {
    const isFree = !!(window as any).__freeViewMode;
    const camMode = comp.cameraMode ?? 'perspective';

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
    cam.near = 0.1;
    cam.far = 50000;

    if (isFree) {
      const yaw      = (window as any).__freeOrbitY   ?? 0.5;
      const pitch    = (window as any).__freeOrbitX   ?? 0.3;
      const dist     = (window as any).__freeDistance ?? 500;
      const lookAtX  = (window as any).__freeLookAtX  ?? 0;
      const lookAtY  = (window as any).__freeLookAtY  ?? 0;
      const lookAtZ  = (window as any).__freeLookAtZ  ?? 0;

      cam.fov    = 50;
      cam.aspect = this.cameraManager.viewportWidth / this.cameraManager.viewportHeight;

      const camX = lookAtX + dist * Math.sin(yaw) * Math.cos(pitch);
      const camY = lookAtY + dist * Math.sin(pitch);
      const camZ = lookAtZ + dist * Math.cos(yaw) * Math.cos(pitch);

      cam.position.set(camX, camY, camZ);
      cam.lookAt(lookAtX, lookAtY, lookAtZ);

      (window as any).__freeCamX = camX;
      (window as any).__freeCamY = camY;
      (window as any).__freeCamZ = camZ;
    } else {
      const baseFov      = comp.cameraFOV      ?? 50;
      const uiZoom       = useViewportStore.getState().settings.cameraViewZoom ?? 1;
      const effectiveFov = Math.max(1, Math.min(170, baseFov / uiZoom));
      const camZ         = comp.cameraPositionZ ?? 1000;
      const orbitX       = comp.cameraRotationX ?? 0;
      const orbitY       = comp.cameraRotationY ?? 0;
      const panX         = comp.cameraPositionX ?? 0;
      const panY         = comp.cameraPositionY ?? 0;

      cam.fov    = effectiveFov;
      cam.aspect = this.cameraManager.viewportWidth / this.cameraManager.viewportHeight;

      const x = camZ * Math.sin(orbitY) * Math.cos(orbitX) + panX;
      const y = -camZ * Math.sin(orbitX) + panY;
      const z = camZ * Math.cos(orbitY) * Math.cos(orbitX);

      cam.position.set(x, y, z);
      cam.lookAt(panX, panY, 0);
    }

    cam.updateProjectionMatrix();
    this.cameraManager.setPerspectiveCamera(
      cam,
      this.renderer.domElement.width,
      this.renderer.domElement.height,
    );
    this.renderLoop.setCamera(cam);

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

  private _getLogicalSize(): { w: number; h: number } {
    const s = new THREE.Vector2();
    this.renderer.getSize(s);
    return { w: s.x, h: s.y };
  }

  // ── Before-render helpers ──────────────────────────────────────

  private _processNestedComps(comp: Composition): void {
    this.renderer.setScissorTest(false);
    const { w: lw, h: lh } = this._getLogicalSize();
    this.renderer.setViewport(0, 0, lw, lh);
    this.renderer.setScissor(0, 0, lw, lh);

    const state = useCompositionStore.getState();
    const parentFrame = Math.floor(comp.currentTime * comp.fps);

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

      const nestedTotalFrames = Math.floor(source.duration * source.fps);
      const localFrame = NestedCompRenderer.computeLocalFrame(
        parentFrame,
        layer.startFrame,
        source.fps,
        comp.fps,
        data,
        nestedTotalFrames,
      );
      const localFrameNum = Math.floor(localFrame);

      const bakedTexture = preProcessManager.get(source.id, localFrameNum);

      if (!bakedTexture) {
        nested.syncLayers(source.layers);
        nested.updateFrameVisibility(localFrameNum, source.layers);
        nested.applyKeyframes(localFrameNum);
        nested.render();
        renderedCount++;

        const parentRenderer = this.layerSync.getRenderer(layer.id);
        if (parentRenderer instanceof CompLayerRenderer) {
          parentRenderer.setTexture(nested.texture);
          parentRenderer.setSize(source.width, source.height);
        }
      } else {
        renderedCount++;
        const parentRenderer = this.layerSync.getRenderer(layer.id);
        if (parentRenderer instanceof CompLayerRenderer) {
          const size = preProcessManager.getSize(source.id);
          parentRenderer.setTexture(bakedTexture);
          if (size) parentRenderer.setSize(size.width, size.height);
        }
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

  private _syncVideoAudio(comp: Composition): void {
    const currentTime = comp.currentTime;
    const fps = comp.fps;
    const currentFrame = Math.floor(currentTime * fps);

    for (const layer of comp.layers) {
      if (layer.type !== 'video') continue;
      const r = this.layerSync.getRenderer(layer.id);
      if (!(r instanceof VideoLayerRenderer)) continue;
      const vdata = layer.data as VideoData | undefined;
      if (!vdata) continue;

      // Compute effective volume with fade envelope
      const overrides = this.propertyBinder.overrides.get(layer.id);
      let baseVol = overrides?.volume != null ? overrides.volume : (vdata.volume ?? 1);
      if (baseVol > 1) baseVol /= 100;
      baseVol = Math.max(0, Math.min(1, baseVol));

      const activeSeg = getActiveSegment(layer, currentFrame);

      // In a gap between segments → silence immediately.
      if (!activeSeg) {
        r.syncAudio(0, true, 0, [], undefined);
        continue;
      }

      let envelope = 1;
      if ((vdata.fadeIn ?? 0) > 0 || (vdata.fadeOut ?? 0) > 0) {
        const segStartSec = activeSeg.startFrame / fps;
        const segEndSec = activeSeg.endFrame / fps;
        envelope = computeFadeEnvelope(
          currentTime,
          segStartSec,
          segEndSec,
          vdata.fadeIn ?? 0,
          vdata.fadeOut ?? 0,
          vdata.fadeInCurve ?? 'linear',
          vdata.fadeOutCurve ?? 'linear',
          vdata.fadeInBezier,
          vdata.fadeOutBezier,
        );
      }

      const effectiveVol = baseVol * envelope;
      const muted = !!vdata.muted;
      const pan = vdata.pan ?? 0;
      const effects = vdata.audioEffects ?? [];
      const eq = vdata.eq;

      // Route everything through VideoLayerRenderer's Web Audio pipeline
      r.syncAudio(effectiveVol, muted, pan, effects, eq);
    }
  }

  private _syncVideoLayers(comp: Composition, currentTime: number): void {
    const isPlaying = useTimelineStore.getState().playbackState === 'playing';
    const fps = comp.fps;
    const timeS = currentTime;
    const currentFrame = Math.floor(timeS * fps);

    for (const layer of comp.layers) {
      if (layer.type !== 'video') continue;
      const r = this.layerSync.getRenderer(layer.id);
      if (!(r instanceof VideoLayerRenderer)) continue;
      const video = r.videoElement;
      if (!video) continue;

      // ── Segment-aware playback ──
      const activeSeg = getActiveSegment(layer, currentFrame);

    if (!activeSeg) {
      // Playhead is in a gap between segments — pause video, hide the mesh,
      // and clear any stale cache overlay so no old frame is visible.
      if (!video.paused) video.pause();
      r.setVisible(false);
      frameCache.hideOverlay();
      continue;
    }

    // Reaching here means playhead is inside a valid segment — ensure visible
    r.setVisible(true);

      const segStartSec = activeSeg.startFrame / fps;
      const segEndSec = activeSeg.endFrame / fps;
      const inRange = timeS >= segStartSec && timeS <= segEndSec;

      if (isPlaying && inRange) {
        r.restoreLiveTexture();
        const vdata = layer.data as VideoData | undefined;
        const videoRate = vdata?.playbackRate ?? 1;
        if (video.playbackRate !== videoRate) video.playbackRate = videoRate;

        let localTime = ((timeS - segStartSec) * videoRate)
                      + (activeSeg.sourceOffset / fps);

        if (vdata?.timeRemap) {
          const sourceFrame = this._getTimeRemapSourceFrame(layer.id, vdata, timeS, fps);
          localTime = sourceFrame / fps;
        }

        if (Math.abs(video.currentTime - localTime) > 0.1) {
          video.currentTime = Math.max(0, Math.min(video.duration || Infinity, localTime));
        }
        if (video.paused) {
          video.play().catch((err) => {
            if (err?.name === 'NotAllowedError') {
              console.warn('[Video] Autoplay blocked');
              video.muted = true;
              video.play().catch(() => {});
            } else {
              console.warn('[Video] Playback error:', err?.message ?? err);
            }
          });
        }
      } else {
        // Paused / scrubbing — show correct frame via cached bitmap or fresh capture
        if (!video.paused) video.pause();
        if (inRange) {
          const vdata = layer.data as VideoData | undefined;
          let localTime = (timeS - segStartSec) + (activeSeg.sourceOffset / fps);

          if (vdata?.timeRemap) {
            const sourceFrame = this._getTimeRemapSourceFrame(layer.id, vdata, timeS, fps);
            localTime = sourceFrame / fps;
          }

          const compFrame = Math.floor(timeS * fps);
          const cachedFrame = this.videoFrameCache.get(layer.id, compFrame);
          if (cachedFrame) {
            // Instant path — use cached bitmap
            r.setCachedBitmap(cachedFrame.imageBitmap);
          } else {
            // Seek video and force additional render passes
            // until we have a valid frame. Otherwise the WebGL canvas keeps
            // showing the OLD VideoTexture frame while we wait for `seeked`.
            const needSeek = Math.abs(video.currentTime - localTime) > 0.05;

            if (needSeek) {
              // Use the VideoLayerRenderer's own queue (drops intermediate seeks)
              // Fallback to direct currentTime if seekTo unavailable
              r.seekTo?.(localTime) ?? (video.currentTime = localTime);
            }

            // Set up a one-shot capture that also invalidates the frame cache
            // so the render loop DOESN'T early-exit next tick.
            const expectedTime = localTime;
            const doCapture = () => {
              if (Math.abs(video.currentTime - expectedTime) > 0.15) return;
              r.captureFrame().then((bitmap) => {
                if (!bitmap) return;
                this.videoFrameCache.store(layer.id, compFrame, bitmap);
                r.setCachedBitmap(bitmap);
                // Force one more render so the new bitmap actually appears
                this._lastFrameHash = '';  // invalidate so beforeRender re-processes
                this.renderLoop.requestRender();
              }).catch(() => {});
            };

            if (needSeek) {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                doCapture();
              };
              video.addEventListener('seeked', onSeeked, { once: true });
            } else {
              // Video is close enough — capture what's already there
              doCapture();
            }
          }
        }
      }
    }
  }

  pauseAllVideos(): void {
    for (const [, r] of this.layerSync.getAllRenderers()) {
      if (r instanceof VideoLayerRenderer && r.videoElement) {
        r.videoElement.pause();
      }
    }
  }

  private _syncAudioLayers(comp: Composition, currentTime: number, isPlaying: boolean): void {
    const fps = comp.fps;
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

  pauseAllAudio(): void {
    for (const [, r] of this._audioRenderers) r.pause();
  }

  stopAllAudio(): void {
    for (const [, r] of this._audioRenderers) r.pause();
  }

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
    if (layer.transform3D) lr.updateTransform3D(layer.transform3D);
    lr.setVisible(layer.visible && layer.is3D);
  }

  private _syncModel3DLayer(layer: any): void {
    const data = layer.data as Model3DData;
    if (!data) return;
    let lr = this.layerSync.getRenderer(layer.id) as Model3DLayerRenderer | undefined;
    if (!lr) return;
    if (lr.getModelGroup() === null && data.url) {
      this._loadModel3D(lr, data);
    }
    if (layer.transform3D) {
      lr.updateTransform3D(layer.transform3D);
    } else {
      const modifiedTransform = ModifierEngine.apply(
        layer,
        useCompositionStore.getState().compositions
          .find(c => c.id === useCompositionStore.getState().activeCompositionId)
          ?.currentTime ?? 0,
      );
      lr.updateTransform(modifiedTransform);
    }
    if (data.autoRotate) {
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
        const fileName = d.fileName || `model.${data.format || 'glb'}`;
        const file = new File([blob], fileName, { type: d.mimeType || 'model/gltf-binary' });
        const loaded = await loadModelFile(file);
        if (loaded.scene) lr.setModel(loaded.scene);
      }
      this.renderLoop.requestRender();
    } catch (err) {
      console.error('[Renderer] Failed to load 3D model:', err);
    }
  }

  private _getTimeRemapSourceFrame(
    layerId: string,
    vdata: VideoData,
    timeS: number,
    fps: number,
  ): number {
    const globalFrame = Math.floor(timeS * fps);
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find(c => c.id === cs.activeCompositionId)
      : null;
    const layer = comp?.layers.find(l => l.id === layerId);
    const localFrame = layer ? Math.max(0, globalFrame - layer.startFrame) : globalFrame;
    const engine = useKeyframeStore.getState().engine;
    const engineKfs = engine.getKeyframesForProperty(layerId, 'timeRemap');
    if (engineKfs.length >= 2) {
      const result = engine.evaluate(layerId, 'timeRemap', localFrame);
      const val = typeof result.value === 'number' ? result.value : localFrame;
      return Math.max(0, Math.round(val));
    }
    if (vdata?.timeRemapKeyframes?.length) {
      return this._interpolateRemap(vdata.timeRemapKeyframes, localFrame);
    }
    return localFrame;
  }

  private _interpolateRemap(
    keyframes: Array<{ time: number; sourceFrame: number }>,
    frame: number,
  ): number {
    if (!keyframes || keyframes.length === 0) return frame;
    if (keyframes.length === 1) return keyframes[0].sourceFrame;
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (frame <= sorted[0].time) return sorted[0].sourceFrame;
    if (frame >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].sourceFrame;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (frame >= sorted[i].time && frame <= sorted[i + 1].time) {
        const t = (frame - sorted[i].time) / (sorted[i + 1].time - sorted[i].time || 1);
        return Math.round(
          sorted[i].sourceFrame + t * (sorted[i + 1].sourceFrame - sorted[i].sourceFrame),
        );
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
  }

  private _processEffects(): void {
    this.renderer.setScissorTest(false);
    const { w: lw, h: lh } = this._getLogicalSize();
    this.renderer.setViewport(0, 0, lw, lh);
    this.renderer.setScissor(0, 0, lw, lh);

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

      const gw = (r as any).geometryWidth?.()  ?? 0;
      const gh = (r as any).geometryHeight?.() ?? 0;
      const isFreeView = !!(window as any).__freeViewMode;

      if (this.effectsRenderer.hasEffects(id) && gw > 0 && gh > 0 && !isFreeView) {
        try {
          const success = this.effectsRenderer.renderLayer(id, r.mesh, gw, gh, r.group);
          if (success) {
            this._toggleOriginalMesh(r, false);
            effectCount++;
          } else {
            this.effectsRenderer.removeLayerEffects(id);
            this._toggleOriginalMesh(r, true);
          }
        } catch (err) {
          console.warn(`[Effects] renderLayer error for ${id}:`, err);
          this.effectsRenderer.removeLayerEffects(id);
          this._toggleOriginalMesh(r, true);
        }
      } else {
        this._toggleOriginalMesh(r, true);
        this.effectsRenderer.removeLayerEffects(id);
      }
    }

    if (effectCount > 0) this.renderLoop.requestRender();
  }

  private _toggleOriginalMesh(
    lr: { mesh: THREE.Mesh; group: THREE.Group },
    visible: boolean,
  ): void {
    if (lr.mesh.visible !== visible) lr.mesh.visible = visible;
  }

  renderCameraPreview(targetCanvas: HTMLCanvasElement): void {
    const comp = this._composition;
    if (!comp || !comp.perspective3D) return;

    const pw = targetCanvas.width;
    const ph = targetCanvas.height;
    if (pw === 0 || ph === 0) return;

    const cameraLayer = comp.layers.find(l => l.type === 'camera' && l.visible !== false);
    const cam = new THREE.PerspectiveCamera(comp.cameraFOV ?? 50, comp.width / comp.height, 0.1, 50000);

    if (cameraLayer && cameraLayer.transform3D) {
      const t3d = cameraLayer.transform3D;
      const cd = cameraLayer.cameraData;
      cam.fov = cd?.focalLength
        ? 2 * Math.atan(36 / (2 * cd.focalLength)) * (180 / Math.PI)
        : (comp.cameraFOV ?? 50);
      cam.position.set(t3d.position.x, t3d.position.y, -t3d.position.z);
      const poi = cd?.pointOfInterest ?? { x: 0, y: 0, z: 0 };
      cam.lookAt(poi.x, poi.y, poi.z);
    } else {
      const camZ   = comp.cameraPositionZ ?? 1000;
      const orbitX = comp.cameraRotationX ?? 0;
      const orbitY = comp.cameraRotationY ?? 0;
      const panX   = comp.cameraPositionX ?? 0;
      const panY   = comp.cameraPositionY ?? 0;
      cam.position.set(
        camZ * Math.sin(orbitY) * Math.cos(orbitX) + panX,
        -camZ * Math.sin(orbitX) + panY,
        camZ * Math.cos(orbitY) * Math.cos(orbitX),
      );
      cam.lookAt(panX, panY, 0);
    }
    cam.updateProjectionMatrix();

    if (!this._previewFBO || this._previewFBOSize.w !== pw || this._previewFBOSize.h !== ph) {
      this._previewFBO?.dispose();
      this._previewFBO = new THREE.WebGLRenderTarget(pw, ph, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        depthBuffer: true,
        stencilBuffer: false,
      });
      this._previewFBOSize = { w: pw, h: ph };
    }

    const prevTarget      = this.renderer.getRenderTarget();
    const prevScissorTest = this.renderer.getScissorTest();

    this.renderer.setRenderTarget(this._previewFBO);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, pw, ph);
    this.renderer.setClearColor(new THREE.Color(comp.backgroundColor ?? '#000000'), 1);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.sceneManager.scene, cam);

    const pixelBuffer = new Uint8Array(pw * ph * 4);
    try {
      this.renderer.readRenderTargetPixels(this._previewFBO, 0, 0, pw, ph, pixelBuffer);
    } catch {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl) {
        gl.finish();
        gl.readPixels(0, 0, pw, ph, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
      }
    }

    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(pw, ph);
      const rowBytes = pw * 4;
      for (let y = 0; y < ph; y++) {
        imgData.data.set(
          pixelBuffer.subarray(y * rowBytes, y * rowBytes + rowBytes),
          (ph - 1 - y) * rowBytes,
        );
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const { w: lw, h: lh } = this._getLogicalSize();
    this.renderer.setViewport(0, 0, lw, lh);
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setScissorTest(prevScissorTest);
  }

  private _ensureTransitionFBOs(width: number, height: number): void {
    const needs = (fbo: THREE.WebGLRenderTarget | null) =>
      !fbo || fbo.width !== width || fbo.height !== height;

    const fboOptions = {
      minFilter:     THREE.LinearFilter,
      magFilter:     THREE.LinearFilter,
      format:        THREE.RGBAFormat,
      depthBuffer:   true,
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

  private _executeTransitions(
    transitions: NonNullable<Renderer['_activeTransitions']>,
  ): void {
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
      : null;
    if (!comp || transitions.length === 0) return;

    const fps    = comp.fps;
    const canvas = this.renderer.domElement;
    const w      = canvas.width;
    const h      = canvas.height;
    if (w === 0 || h === 0) return;

    this._ensureTransitionFBOs(w, h);

    const savedTarget = this.renderer.getRenderTarget();
    const storeState  = useCompositionStore.getState();
    const compState   = storeState.activeCompositionId
      ? storeState.compositions.find(c => c.id === storeState.activeCompositionId)
      : null;
    const savedTime   = compState?.currentTime ?? 0;

    try {
      this._disableCompositionScissor();

      const renderAtFrame = (frame: number, target: THREE.WebGLRenderTarget) => {
        if (compState) cs.setCurrentTime(compState.id, frame / fps);
        this.renderLoop.beforeRender?.();
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

      const captureFrames = new Set<number>();
      captureFrames.add(transitions[0].startFrame);
      for (const t of transitions) captureFrames.add(t.endFrame);
      const frameList = Array.from(captureFrames).sort((a, b) => a - b);

      const texCache = new Map<number, THREE.Texture>();
      for (let i = 0; i < frameList.length; i++) {
        const f      = frameList[i];
        const target = i % 2 === 0 ? this._transitionFBO_A! : this._transitionFBO_B!;
        renderAtFrame(f, target);
        texCache.set(f, target.texture);
      }

      let accumTex = texCache.get(transitions[0].startFrame)!;

      for (let i = 0; i < transitions.length; i++) {
        const t       = transitions[i];
        const nextTex = texCache.get(t.endFrame)!;

        if (i === transitions.length - 1) {
          this.renderer.setRenderTarget(null);
          this.renderer.setViewport(0, 0, w, h);
          this.renderer.setScissorTest(false);
          this.renderer.setClearColor(0, 0);
          this.renderer.clear(true, true, true);
          this.transitionCompositor.apply(
            t.transitionId, t.params, t.progress,
            accumTex, nextTex, null as any, w, h,
          );
        } else {
          this.renderer.setRenderTarget(this._transitionFBO_Accumulated!);
          this.renderer.setViewport(0, 0, w, h);
          this.renderer.setScissorTest(false);
          this.renderer.clear(true, true, true);
          this.transitionCompositor.apply(
            t.transitionId, t.params, t.progress,
            accumTex, nextTex, this._transitionFBO_Accumulated!, w, h,
          );
          accumTex = this._transitionFBO_Accumulated!.texture;
        }
      }
    } catch (err) {
      console.warn('[Renderer] Transitions error:', err);
    } finally {
      if (compState) cs.setCurrentTime(compState.id, savedTime);
      this.renderer.setRenderTarget(savedTarget);
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
    if (this._compStoreUnsub) {
      this._compStoreUnsub();
      this._compStoreUnsub = null;
    }

    this.gpuTextureCache.dispose();
    this.videoFrameCache.dispose();
    this.renderScheduler.dispose();
    this.perfMonitor.dispose();

    for (const r of this._audioRenderers.values()) r.dispose();
    this._audioRenderers.clear();

    this._transitionFBO_A?.dispose();
    this._transitionFBO_A = null;
    this._transitionFBO_B?.dispose();
    this._transitionFBO_B = null;
    this._transitionFBO_Accumulated?.dispose();
    this._transitionFBO_Accumulated = null;
    this._previewFBO?.dispose();
    this._previewFBO = null;

    this._captureCanvas = null;

    frameCache.dispose();
    scrubPrewarmer.dispose();
    this._cacheWorker?.terminate();
    this._cacheWorker = null;



    delete (window as any).__perfMonitor;
    delete (window as any).__workerPool;
    delete (window as any).__renderer;
    delete (window as any).__frameCache;

    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}