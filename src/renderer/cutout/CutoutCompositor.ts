/**
 * CutoutCompositor — per-layer compositor that applies the cutout shader.
 *
 * For each layer with cutout enabled, on every frame:
 *   1. Check for a baked alpha bundle → use if present
 *   2. Fallback to realtime model evaluation (async, may not be ready)
 *   3. Run cutoutShader with the source texture + mask texture
 *   4. Return the resulting textured FBO to the layer renderer for display
 */
import * as THREE from 'three';
import type { CutoutData, Layer } from '../../types/layer';
import { createCutoutMaterial } from './cutoutShader';
import { loadBakedAlpha, getBakedFrameRect } from './CutoutAlphaCache';

interface FBOSlot {
  fbo: THREE.WebGLRenderTarget;
  width: number;
  height: number;
}

interface LayerState {
  fbo: FBOSlot | null;
  material: THREE.ShaderMaterial;
  bakedBitmap: ImageBitmap | null;
  bakedManifest: { frameCount: number; frameWidth: number; frameHeight: number } | null;
  loadedForLayer: string;
  lastMaskTexture: THREE.Texture | null;
  solidWhiteMask: THREE.DataTexture | null;
  lastBakedFrameIndex: number;
}

export class CutoutCompositor {
  private _states = new Map<string, LayerState>();
  private _quadScene: THREE.Scene;
  private _quadCamera: THREE.OrthographicCamera;
  private _quadMesh: THREE.Mesh;

  constructor() {
    this._quadScene = new THREE.Scene();
    this._quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    this._quadMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this._quadScene.add(this._quadMesh);
  }

  /**
   * Composite the cutout onto a layer's source texture.
   *
   * SYNCHRONOUS. On first call for a layer, kicks off async loads
   * (baked alpha PNG, ONNX model). While those are loading returns null
   * so the caller shows the raw texture. Once resources are ready,
   * subsequent calls return the composited FBO immediately.
   */
  apply(
    renderer: THREE.WebGLRenderer,
    layer: Layer,
    source: THREE.Texture,
    layerWidth: number,
    layerHeight: number,
    frame: number,
    cutout: CutoutData,
    videoElement: HTMLVideoElement | null,
    imageElement: HTMLImageElement | null,
  ): THREE.WebGLRenderTarget | null {
    if (!cutout.enabled) return null;

    let state = this._states.get(layer.id);
    if (!state) {
      state = {
        fbo: null,
        material: createCutoutMaterial(),
        bakedBitmap: null,
        bakedManifest: null,
        loadedForLayer: '',
        lastMaskTexture: null,
        solidWhiteMask: null,
        lastBakedFrameIndex: -1,
      };
      this._states.set(layer.id, state);
    }

    // Kick off async bake load ONCE per layer — subsequent frames use cached
    if (state.loadedForLayer !== layer.id) {
      state.loadedForLayer = layer.id;
      loadBakedAlpha(layer.id).then(bundle => {
        if (bundle && state) {
          state.bakedBitmap = bundle.bitmap;
          state.bakedManifest = {
            frameCount: bundle.manifest.frameCount,
            frameWidth: bundle.manifest.frameWidth,
            frameHeight: bundle.manifest.frameHeight,
          };
          state.lastBakedFrameIndex = -1;   // force regen on next apply
        }
      }).catch(() => {});
    }

    // Ensure FBO of correct size
    if (!state.fbo || state.fbo.width !== layerWidth || state.fbo.height !== layerHeight) {
      state.fbo?.fbo?.dispose();
      state.fbo = {
        fbo: new THREE.WebGLRenderTarget(layerWidth, layerHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          depthBuffer: false,
          stencilBuffer: false,
        }),
        width: layerWidth,
        height: layerHeight,
      };
    }

    // Resolve mask texture — baked preferred, chroma-only fallback, else skip
    let maskTexture: THREE.Texture | null = null;

    if (state.bakedBitmap && state.bakedManifest) {
      const frameIndex = Math.min(frame, state.bakedManifest.frameCount - 1);

      if (state.lastBakedFrameIndex === frameIndex && state.lastMaskTexture) {
        // Same frame as last time — reuse the existing GPU texture instead
        // of recreating a canvas + texture every frame (was causing severe
        // playback stutter).
        maskTexture = state.lastMaskTexture;
      } else {
        const rect = getBakedFrameRect(
          { bitmap: state.bakedBitmap, manifest: {
            model: '', bakedAt: 0,
            frameCount: state.bakedManifest.frameCount,
            frameWidth: state.bakedManifest.frameWidth,
            frameHeight: state.bakedManifest.frameHeight,
          }},
          frameIndex,
        );
        // Guard against a bad/zero-size rect — fall back to no-mask rather
        // than rendering a solid black frame.
        if (rect && rect.w > 0 && rect.h > 0) {
          maskTexture = this._bakedRectToTexture(state, state.bakedBitmap, rect);
          state.lastBakedFrameIndex = frameIndex;
        }
      }
    }

    // Chroma-only mode: use solid-white mask so chroma pass does all the keying
    if (!maskTexture) {
      if (!cutout.chroma?.enabled) {
        // No baked, no chroma, no realtime yet — return null (skip cutout this frame)
        return null;
      }
      if (!state.solidWhiteMask) {
        state.solidWhiteMask = new THREE.DataTexture(
          new Uint8Array([255, 255, 255, 255]),
          1, 1, THREE.RGBAFormat,
        );
        state.solidWhiteMask.needsUpdate = true;
      }
      maskTexture = state.solidWhiteMask;
    }

    // Suppress unused warnings
    void videoElement;
    void imageElement;

    // Set uniforms
    const mat = state.material;
    mat.uniforms.tDiffuse.value = source;
    mat.uniforms.tMask.value = maskTexture;
    mat.uniforms.uResolution.value.set(layerWidth, layerHeight);
    mat.uniforms.uFeather.value = cutout.feather ?? 0;
    mat.uniforms.uContract.value = cutout.contract ?? 0;
    mat.uniforms.uSmoothing.value = Math.max(0, Math.min(1, (cutout.smoothing ?? 0) / 100));
    mat.uniforms.uThreshold.value = Math.max(0, Math.min(1, (cutout.threshold ?? 50) / 100));

    // Stroke
    const s = cutout.stroke;
    if (s?.enabled) {
      const c = hexToRgb(s.color);
      mat.uniforms.uStrokeEnabled.value = 1;
      mat.uniforms.uStrokeColor.value.set(c.r, c.g, c.b, 1);
      mat.uniforms.uStrokeWidth.value = s.width ?? 0;
      mat.uniforms.uStrokeSoftness.value = Math.max(0, Math.min(1, (s.softness ?? 0) / 100));
      mat.uniforms.uStrokePosition.value =
        s.position === 'inside' ? 0 : s.position === 'center' ? 2 : 1;
      mat.uniforms.uStrokeStyle.value = s.style === 'glow' ? 1 : 0;
    } else {
      mat.uniforms.uStrokeEnabled.value = 0;
    }

    // Chroma
    const chroma = cutout.chroma;
    if (chroma?.enabled) {
      const cc = hexToRgb(chroma.keyColor ?? '#00ff00');
      mat.uniforms.uChromaEnabled.value = 1;
      mat.uniforms.uChromaKey.value.set(cc.r, cc.g, cc.b);
      mat.uniforms.uChromaSimilarity.value = Math.max(0, Math.min(1, (chroma.similarity ?? 40) / 100));
      mat.uniforms.uChromaSmoothness.value = Math.max(0, Math.min(1, (chroma.smoothness ?? 20) / 100));
      mat.uniforms.uChromaSpill.value = Math.max(0, Math.min(1, (chroma.spillSuppress ?? 30) / 100));
    } else {
      mat.uniforms.uChromaEnabled.value = 0;
    }

    // Manual mask
    const manualStrokes = cutout.manualStrokes ?? [];
    const manualMode = cutout.manualMode ?? 'ai';
    if (manualStrokes.length > 0 && manualMode !== 'ai') {
      // Import synchronously via cached reference
      const cache = (this as any)._maskCacheModule;
      if (cache?.getManualMaskTexture) {
        const manualTex = cache.getManualMaskTexture(
          layer.id, manualStrokes, layerWidth, layerHeight,
        );
        if (manualTex) {
          mat.uniforms.tManualMask.value = manualTex;
          mat.uniforms.uManualEnabled.value = 1;
          mat.uniforms.uManualMode.value = manualMode === 'replace' ? 1 : 2;
        } else {
          mat.uniforms.uManualEnabled.value = 0;
        }
      } else {
        // Lazy import once — subsequent calls hit the cached ref
        import('./ManualMaskCache').then(m => {
          (this as any)._maskCacheModule = m;
        });
        mat.uniforms.uManualEnabled.value = 0;
      }
    } else {
      mat.uniforms.uManualEnabled.value = 0;
    }

    // Guard against feedback loop: if source texture IS the output FBO's
    // texture, skip this frame to avoid WebGL read-write conflict.
    // Return null so the layer shows the raw (current) texture instead of
    // a stale cutout result from the previous frame.
    if (source === state.fbo.fbo.texture) {
      return null;
    }

    // Render quad
    this._quadMesh.material = mat;

    const prevTarget = renderer.getRenderTarget();
    const prevScissorTest = renderer.getScissorTest();
    const prevAutoClear = renderer.autoClear;
    renderer.setRenderTarget(state.fbo.fbo);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, layerWidth, layerHeight);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this._quadScene, this._quadCamera);

    renderer.setRenderTarget(prevTarget);
    renderer.setScissorTest(prevScissorTest);
    renderer.autoClear = prevAutoClear;

    return state.fbo.fbo;
  }

  /** Extract a sub-rect from a baked stacked-mask PNG and upload as a texture */
  private _bakedRectToTexture(
    state: LayerState,
    bitmap: ImageBitmap,
    rect: { x: number; y: number; w: number; h: number },
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = rect.w;
    canvas.height = rect.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

    if (state.lastMaskTexture) state.lastMaskTexture.dispose();
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    state.lastMaskTexture = tex;
    return tex;
  }

  /** Force a re-fetch of the baked bundle for a layer (e.g., after bake) */
  invalidateBakedForLayer(layerId: string): void {
    const state = this._states.get(layerId);
    if (state) {
      if (state.bakedBitmap) {
        try { state.bakedBitmap.close(); } catch {}
      }
      state.bakedBitmap = null;
      state.bakedManifest = null;
      state.loadedForLayer = '';
      state.lastBakedFrameIndex = -1;
      if (state.lastMaskTexture) {
        state.lastMaskTexture.dispose();
        state.lastMaskTexture = null;
      }
    }
  }

  /** Discard a layer's compositor state on layer removal */
  removeLayer(layerId: string): void {
    const state = this._states.get(layerId);
    if (!state) return;
    state.fbo?.fbo?.dispose();
    state.material.dispose();
    state.solidWhiteMask?.dispose();
    if (state.lastMaskTexture) state.lastMaskTexture.dispose();
    if (state.bakedBitmap) {
      try { state.bakedBitmap.close(); } catch {}
    }
    // Also dispose manual mask cache for this layer
    import('./ManualMaskCache').then(({ disposeManualMaskCache }) => {
      disposeManualMaskCache(layerId);
    });
    this._states.delete(layerId);
  }

  dispose(): void {
    for (const layerId of this._states.keys()) this.removeLayer(layerId);
    (this._quadMesh.geometry as THREE.BufferGeometry).dispose();
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8)  & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}