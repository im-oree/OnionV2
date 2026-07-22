/**
 * PreProcessManager — bakes nested composition frames into GPU-ready
 * CanvasTextures so the parent comp can display them without re-rendering.
 *
 * Usage:
 *   1. User right-clicks a comp layer → "Pre-process Comp"
 *   2. PreProcessManager.bake() renders every frame of the source comp
 *      into an orthographic camera and stores the result as CanvasTextures.
 *   3. During playback, the Renderer checks preProcessManager.get(compId, frame)
 *      and uses the baked texture instead of re-rendering via NestedCompRenderer.
 */
import * as THREE from 'three';
import { useCompositionStore } from '../state/compositionStore';
import { useNotificationStore } from '../state/notificationStore';
import type { Composition } from '../types/composition';
import { LayerFactory } from './layers/LayerFactory';
import { SceneManager } from './SceneManager';
import { PropertyBinder } from '../animation/PropertyBinder';
import { useKeyframeStore } from '../state/keyframeStore';


export interface BakeProgress {
  state: 'idle' | 'baking' | 'complete' | 'cancelled';
  totalFrames: number;
  bakedFrames: number;
  currentFrame: number;
  sourceCompId: string;
}

class PreProcessManagerClass {
  /** sourceCompId → array of baked CanvasTextures, indexed by frame number */
  private _bakedFrames = new Map<string, THREE.CanvasTexture[]>();
  /** sourceCompId → source comp width/height */
  private _bakedSizes = new Map<string, { width: number; height: number }>();

  private _state: BakeProgress = {
    state: 'idle', totalFrames: 0, bakedFrames: 0, currentFrame: 0, sourceCompId: '',
  };
  private _buildId = 0;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _onProgress: ((p: BakeProgress) => void) | null = null;

  set onProgress(cb: ((p: BakeProgress) => void) | null) {
    this._onProgress = cb;
  }

  get state(): BakeProgress { return { ...this._state }; }

  /** Check if a comp has been pre-processed */
  isBaked(sourceCompId: string): boolean {
    return this._bakedFrames.has(sourceCompId);
  }

  /** Get the baked texture for a specific frame, or null if not available */
  get(sourceCompId: string, frame: number): THREE.CanvasTexture | null {
    const frames = this._bakedFrames.get(sourceCompId);
    if (!frames) return null;
    const idx = Math.max(0, Math.min(frames.length - 1, Math.floor(frame)));
    return frames[idx] ?? null;
  }

  /** Get the pre-baked size for a comp */
  getSize(sourceCompId: string): { width: number; height: number } | null {
    return this._bakedSizes.get(sourceCompId) ?? null;
  }

  /**
   * Bake all frames of a source composition into CanvasTextures.
   * Uses a lightweight offscreen render approach.
   */
  bake(
    sourceCompId: string,
    gl: THREE.WebGLRenderer,
    onComplete?: () => void,
  ): void {
    // Cancel any in-progress bake
    this._cancel();

    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === sourceCompId);
    if (!comp) {
      console.warn('[PreProcessManager] Source comp not found:', sourceCompId);
      return;
    }

    // If already baked, clear and re-bake
    this._disposeFrames(sourceCompId);

    const totalFrames = Math.floor(comp.duration * comp.fps);
    if (totalFrames <= 0 || comp.fps <= 0) {
      console.warn('[PreProcessManager] Comp has no frames:', sourceCompId);
      return;
    }

    // Show notification
    const addNotif = useNotificationStore.getState().addNotification;
    addNotif({
      type: 'info',
      message: `Pre-processing "${comp.name}" (${totalFrames} frames)...`,
      autoDismiss: 3000,
    });

    this._state = {
      state: 'baking',
      totalFrames,
      bakedFrames: 0,
      currentFrame: 0,
      sourceCompId,
    };
    this._emitProgress();

    const buildId = ++this._buildId;
    this._bakedFrames.set(sourceCompId, []);
    this._bakedSizes.set(sourceCompId, { width: comp.width, height: comp.height });

    // Set up offscreen rendering
    const width = comp.width;
    const height = comp.height;

    const bakeScene = new SceneManager();
    bakeScene.applyComposition(width, height, comp.backgroundColor);
    bakeScene.grid.hide();
    bakeScene.safeZones.hide();

    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2, height / 2, -height / 2, -1000, 1000,
    );
    camera.position.set(0, 0, 500);

    const bakeFactory = new LayerFactory(bakeScene);
    const layerRenderers = new Map<string, ReturnType<typeof bakeFactory.create>>();
    const layerMap = new Map<string, any>();
    const propertyBinder = new PropertyBinder(useKeyframeStore.getState().engine);
    // Sync layers
    for (const l of comp.layers) {
      if (l.type === 'comp') continue;
      layerMap.set(l.id, l);
      const r = bakeFactory.create(l);
      layerRenderers.set(l.id, r);
      r.updateTransform(l.transform);
      r.updateOpacity(l.opacity / 100);
      r.setVisible(l.visible && l.type !== 'transition');
    }

    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const _bakeNextFrame = (frame: number) => {
      if (frame > totalFrames - 1 || this._buildId !== buildId) {
        // Done
        const wasBuilding = this._state.state === 'baking';
        this._state = {
          ...this._state,
          state: wasBuilding ? 'complete' : this._state.state,
          bakedFrames: frame > totalFrames - 1 ? totalFrames : this._state.bakedFrames,
        };
        this._emitProgress();

        // Clean up bake resources
        for (const r of layerRenderers.values()) bakeFactory.remove(r);
        layerRenderers.clear();
        renderTarget.dispose();
        bakeScene.dispose();

        if (wasBuilding) {
          addNotif({
            type: 'success',
            message: `Pre-processed "${comp.name}" — ${totalFrames} frames baked`,
            autoDismiss: 2500,
          });
          onComplete?.();
        }
        return;
      }

      this._state = { ...this._state, currentFrame: frame, bakedFrames: frame };
      this._emitProgress();

      const localFrame = frame;

      // Update frame visibility
      for (const layer of comp.layers) {
        const r = layerRenderers.get(layer.id);
        if (!r) continue;
        const inRange = localFrame >= layer.startFrame && localFrame <= layer.endFrame;
        r.setVisible(layer.visible && inRange && layer.type !== 'transition');
      }

      // Evaluate keyframes
      const count = propertyBinder.evaluateFrame(sourceCompId, localFrame);
      if (count > 0 && propertyBinder.hasOverrides) {
        for (const [layerId, override] of propertyBinder.overrides) {
          const r = layerRenderers.get(layerId);
          if (!r) continue;
          const layer = layerMap.get(layerId);
          if (!layer) continue;
          r.updateTransform({
            position: override.position ?? layer.transform.position,
            scale: override.scale ?? layer.transform.scale,
            rotation: override.rotation ?? layer.transform.rotation,
            anchorPoint: override.anchorPoint ?? layer.transform.anchorPoint,
          });
          if (override.opacity !== undefined) r.updateOpacity(override.opacity / 100);
        }
      }

      // Render to FBO
      const prevTarget = gl.getRenderTarget();
      gl.setRenderTarget(renderTarget);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, true, true);
      gl.render(bakeScene.scene, camera);
      // Read pixels directly from the FBO while it's still bound
      const readPixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, readPixels);
      gl.setRenderTarget(prevTarget);

      // Use canvas capture approach
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Flip vertically (WebGL reads bottom-up)
      const imageData = ctx.createImageData(width, height);
      const rowBytes = width * 4;
      for (let y = 0; y < height; y++) {
        const src = y * rowBytes;
        const dst = (height - 1 - y) * rowBytes;
        imageData.data.set(readPixels.subarray(src, src + rowBytes), dst);
      }
      ctx.putImageData(imageData, 0, 0);

      // Create CanvasTexture from the canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      const frames = this._bakedFrames.get(sourceCompId);
      if (frames) frames.push(texture);

      // Schedule next frame with small delay to keep UI responsive
      const delay = frame % 8 === 0 ? 2 : 0;
      this._timeoutId = setTimeout(() => _bakeNextFrame(frame + 1), delay);
    };

    // Start baking from frame 0
    _bakeNextFrame(0);
  }

  /** Cancel an in-progress bake */
  cancel(): void {
    this._cancel();
    this._state = { ...this._state, state: 'cancelled' };
    this._emitProgress();
  }

  /** Clear pre-processed data for a source comp */
  clear(sourceCompId: string): void {
    this._disposeFrames(sourceCompId);
    this._bakedSizes.delete(sourceCompId);

    const addNotif = useNotificationStore.getState().addNotification;
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === sourceCompId);
    addNotif({
      type: 'info',
      message: `Cleared pre-processing for "${comp?.name ?? sourceCompId}"`,
      autoDismiss: 2000,
    });
  }

  /** Dispose everything */
  dispose(): void {
    this._cancel();
    for (const [id] of this._bakedFrames) {
      this._disposeFrames(id);
    }
    this._bakedFrames.clear();
    this._bakedSizes.clear();
  }

  // ── Private ──

  private _cancel(): void {
    this._buildId++;
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  private _disposeFrames(sourceCompId: string): void {
    const frames = this._bakedFrames.get(sourceCompId);
    if (frames) {
      for (const tex of frames) {
        tex.dispose();
        if (tex.image instanceof HTMLCanvasElement) {
          tex.image.width = 0;
          tex.image.height = 0;
        }
      }
    }
    this._bakedFrames.delete(sourceCompId);
  }

  private _emitProgress(): void {
    try { this._onProgress?.(this.state); } catch {}
  }
}

/** Singleton instance */
export const preProcessManager = new PreProcessManagerClass();
