/**
 * AdjustPassRenderer – applies the Adjust color grade to a layer's rendered
 * texture via a full-screen quad. One FBO per unique size, safe across layers.
 */
import * as THREE from 'three';
import {
  createAdjustMaterial, applyAdjustUniforms, isAdjustActive,
} from '../effects/library/adjustPass';

export class AdjustPassRenderer {
  /** One material per layer id to avoid uniform bleed between layers */
  private _materials = new Map<string, THREE.ShaderMaterial>();
  private _quadMesh: THREE.Mesh;
  private _quadScene: THREE.Scene;
  private _quadCamera: THREE.OrthographicCamera;
  /** Pool of FBOs keyed by "WxH" — one per size bucket */
  private _fboPool = new Map<string, THREE.WebGLRenderTarget>();

  constructor() {
    const geo = new THREE.PlaneGeometry(2, 2);
    // Placeholder material — swapped per-call
    this._quadMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this._quadScene = new THREE.Scene();
    this._quadScene.add(this._quadMesh);
    this._quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /**
   * Apply the adjust pass for a specific layer.
   * Returns the FBO holding the result, or null if adjust is inactive.
   * The FBO is owned by AdjustPassRenderer — do NOT dispose.
   * Texture reference is valid only for the current frame.
   */
  apply(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    width: number,
    height: number,
    adjustData: any,
    layerId: string = '__default',
  ): THREE.WebGLRenderTarget | null {
    if (!isAdjustActive(adjustData)) return null;

    // Get or create a per-layer material so uniforms never bleed between layers
    let material = this._materials.get(layerId);
    if (!material) {
      material = createAdjustMaterial();
      this._materials.set(layerId, material);
    }

    const fbo = this._getFBO(width, height, inputTexture);
    if (!fbo) return null; // size conflict — skip rather than feedback loop

    material.uniforms.tDiffuse.value = inputTexture;

    // LUT wiring — bind the 3D texture from lutStore
    const lutId = adjustData?.lutId ?? '__identity'; // Default to identity, not undefined
    if (lutId !== '__identity') {
      const lutStoreState = (window as any).__lutStore?.getState?.();
      if (lutStoreState) {
        const tex = lutStoreState.getTexture(lutId);
        const entry = lutStoreState.getEntry(lutId);
        if (tex && entry) {
          material.uniforms.uLutTex.value = tex;
          material.uniforms.uLutSize.value = entry.size;
          material.uniforms.uLutEnabled.value = 1;
        } else {
          // LUT ID was set but texture unavailable — fall back to identity
          material.uniforms.uLutEnabled.value = 0;
        }
      } else {
        material.uniforms.uLutEnabled.value = 0;
      }
    } else {
      // Identity LUT selected — skip LUT pass entirely
      material.uniforms.uLutEnabled.value = 0;
    }

    applyAdjustUniforms(material, adjustData, width, height);

    // Force uLutIntensity=0 when no LUT is active
    if (material.uniforms.uLutEnabled.value === 0) {
      material.uniforms.uLutIntensity.value = 0;
    }

    // Swap material onto the shared quad mesh
    this._quadMesh.material = material;

    const prevTarget = renderer.getRenderTarget();
    const prevScissorTest = renderer.getScissorTest();
    const prevAutoClear = renderer.autoClear;

    renderer.setRenderTarget(fbo);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this._quadScene, this._quadCamera);

    renderer.setRenderTarget(prevTarget);
    renderer.setScissorTest(prevScissorTest);
    renderer.autoClear = prevAutoClear;

    return fbo;
  }

  private _getFBO(
    w: number,
    h: number,
    inputTexture: THREE.Texture,
  ): THREE.WebGLRenderTarget | null {
    const key = `${w}x${h}`;
    let fbo = this._fboPool.get(key);

    if (fbo) {
      // Guard against feedback loop: if this FBO's texture IS the input,
      // we cannot render into it while reading from it.
      if (fbo.texture === inputTexture) return null;
      return fbo;
    }

    fbo = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this._fboPool.set(key, fbo);
    return fbo;
  }

  dispose(): void {
    for (const fbo of this._fboPool.values()) fbo.dispose();
    this._fboPool.clear();
    for (const mat of this._materials.values()) mat.dispose();
    this._materials.clear();
    (this._quadMesh.geometry as THREE.BufferGeometry).dispose();
  }
}