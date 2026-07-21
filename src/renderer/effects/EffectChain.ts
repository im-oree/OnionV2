/**
 * EffectChain — per-layer GPU effect pipeline.
 * Manages ping-pong FBOs and renders effects sequentially.
 *
 * Process:
 *   1. Render source layer to FBO A
 *   2. Apply effect 1 → FBO B
 *   3. Apply effect 2 → FBO A (ping-pong)
 *   ... alternating ...
 *   4. Final result composited into scene as textured quad
 *
 * Operations entirely on GPU — no CPU roundtrips.
 *
 * Shader code lives in library/<effect>.ts modules. This class reads
 * from EffectShaderRegistry to get each effect's implementation.
 */
import * as THREE from 'three';
import type { EffectInstance } from '../../types/effect';
import { effectRegistry } from './EffectRegistry';
import { effectShaderRegistry } from './EffectShaderRegistry';
import type { EffectRenderContext } from './library/types';
import { DEFAULT_VERTEX_SHADER } from './library/types';

export class EffectChain {
  private renderer: THREE.WebGLRenderer;
  /** Cached ShaderMaterial per effect (reused across frames) */
  private materialCache = new Map<string, THREE.ShaderMaterial>();
  /** Source texture (the layer's rendered content) */
  private sourceTexture: THREE.Texture | null = null;

  /** Layer bounds for FBO sizing */
  private layerWidth = 0;
  private layerHeight = 0;

  /** Persistent ping-pong targets. These are NOT returned to FBOPool each frame. */
  private targetA: THREE.WebGLRenderTarget | null = null;
  private targetB: THREE.WebGLRenderTarget | null = null;
  private targetW = 0;
  private targetH = 0;

  /** Exposed for callers that need the post-effect output texture of a layer chain. */
  private _lastResultTexture: THREE.Texture | null = null;
  get lastResultTexture(): THREE.Texture | null { return this._lastResultTexture; }

  /** Transient scratch buffers used by customRender hooks. Reused per render. */
  private _scratchTargets: THREE.WebGLRenderTarget[] = [];
  private _scratchInUse = 0;

  /** Current composition time in seconds — injected via setSource for animated effects */
  private currentTime = 0;

  private fullscreenScene: THREE.Scene | null = null;
  private fullscreenCamera: THREE.OrthographicCamera | null = null;
  private fullscreenQuad: THREE.Mesh | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  /** Set the source texture to process through the chain */
  setSource(texture: THREE.Texture, width: number, height: number, time: number = 0): void {
    this.sourceTexture = texture;
    this.layerWidth = Math.max(1, Math.ceil(width));
    this.layerHeight = Math.max(1, Math.ceil(height));
    this.currentTime = time;
  }

  /** Render the effect stack. Returns a persistent final texture. */
  render(effects: EffectInstance[]): THREE.Texture | null {
    if (!this.sourceTexture) return null;

    const enabled = effects.filter((e) => e.enabled);
    if (enabled.length === 0) return this.sourceTexture;

    const w = Math.max(1, Math.ceil(this.layerWidth));
    const h = Math.max(1, Math.ceil(this.layerHeight));
    this._ensureTargets(w, h);

    if (!this.targetA || !this.targetB) return null;

    const oldTarget = this.renderer.getRenderTarget();
    const oldViewport = new THREE.Vector4();
    const oldScissor = new THREE.Vector4();

    this.renderer.getViewport(oldViewport);
    this.renderer.getScissor(oldScissor);
    const oldScissorTest = this.renderer.getScissorTest();

    try {
      // Copy source texture into targetA first.
      this._renderTextureToTarget(this.sourceTexture, this.targetA, w, h);

      let read = this.targetA;
      let write = this.targetB;

      for (const effect of enabled) {
        const module = effectShaderRegistry.get(effect.type);
        if (!module) {
          console.warn(`[EffectChain] No shader module registered for ${effect.type}`);
          continue;
        }

        const def = effectRegistry.get(effect.type);
        if (!def || def.passes === 0) continue;

        if (module.customRender) {
          // Effect provides its own render logic (e.g. separable blur).
          const ctx: EffectRenderContext = {
            renderer: this.renderer,
            instance: effect,
            readTexture: read.texture,
            writeTarget: write,
            width: w,
            height: h,
            currentTime: this.currentTime,
            getMaterial: (subKey, fragmentShader, uniforms) =>
              this._getMaterialForKey(
                `${effect.type}_${effect.id}_${subKey}`,
                effect,
                module.vertexShader,
                fragmentShader,
                uniforms,
              ),
            acquireScratch: (sw, sh) => this._acquireScratch(sw, sh),
            renderPass: (mat, target) => this._renderMaterialToTarget(mat, target, w, h),
          };
          module.customRender(ctx);
          // Release any scratch buffers this effect used.
          this._releaseAllScratch();
        } else if (module.fragmentShader) {
          // Standard single-pass path.
          const mat = this._getMaterialForKey(
            `${effect.type}_${effect.id}`,
            effect,
            module.vertexShader,
            module.fragmentShader,
          );
          this._syncUniforms(mat, effect);
          if ((mat.uniforms as any).uTexture) {
            (mat.uniforms as any).uTexture.value = read.texture;
          }
          if ((mat.uniforms as any).uResolution?.value?.set) {
            (mat.uniforms as any).uResolution.value.set(w, h);
          }
          if ((mat.uniforms as any).uTime) {
            (mat.uniforms as any).uTime.value = this.currentTime;
          }
          this._renderMaterialToTarget(mat, write, w, h);
        } else {
          console.warn(`[EffectChain] Effect ${effect.type} has neither fragmentShader nor customRender`);
          continue;
      }

      [read, write] = [write, read];
    }

    // Store the final output texture for external callers (e.g. Displacement Map).
    this._lastResultTexture = read.texture;
    return read.texture;
    } finally {
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.setViewport(oldViewport);
      this.renderer.setScissor(oldScissor);
      this.renderer.setScissorTest(oldScissorTest);
    }
  }

  /** Kept for compatibility. Persistent targets are released only on resize/dispose. */
  releaseResult(): void {
    // no-op
  }

  // ── Target management ──────────────────────────────────────

  private _ensureTargets(w: number, h: number): void {
    if (this.targetA && this.targetB && this.targetW === w && this.targetH === h) {
      return;
    }

    this._disposeTargets();

    this.targetA = this._createTarget(w, h, 'effect-chain-A');
    this.targetB = this._createTarget(w, h, 'effect-chain-B');
    this.targetW = w;
    this.targetH = h;
  }

  private _createTarget(w: number, h: number, name: string): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    rt.texture.name = `${name}-${w}x${h}`;
    rt.texture.colorSpace = THREE.SRGBColorSpace;

    return rt;
  }

  private _disposeTargets(): void {
    if (this.targetA) {
      this.targetA.dispose();
      this.targetA = null;
    }
    if (this.targetB) {
      this.targetB.dispose();
      this.targetB = null;
    }
    this.targetW = 0;
    this.targetH = 0;
  }

  // ── Scratch buffer pool (for customRender hooks) ───────────

  private _acquireScratch(w: number, h: number): THREE.WebGLRenderTarget {
    // Reuse an existing scratch buffer if size matches; otherwise create new.
    for (let i = this._scratchInUse; i < this._scratchTargets.length; i++) {
      const rt = this._scratchTargets[i];
      if (rt.width === w && rt.height === h) {
        // Swap into the "in use" slot.
        [this._scratchTargets[this._scratchInUse], this._scratchTargets[i]] =
          [this._scratchTargets[i], this._scratchTargets[this._scratchInUse]];
        this._scratchInUse++;
        return this._scratchTargets[this._scratchInUse - 1];
      }
    }
    const rt = this._createTarget(w, h, 'scratch');
    this._scratchTargets.splice(this._scratchInUse, 0, rt);
    this._scratchInUse++;
    return rt;
  }

  private _releaseAllScratch(): void {
    this._scratchInUse = 0;
    // Trim: if we have more than 4 scratch buffers, dispose extras.
    while (this._scratchTargets.length > 4) {
      const rt = this._scratchTargets.pop();
      rt?.dispose();
    }
  }

  // ── Fullscreen quad helpers ────────────────────────────────

  private _getFullscreenObjects(): {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    quad: THREE.Mesh;
  } {
    if (!this.fullscreenScene) {
      this.fullscreenScene = new THREE.Scene();
    }

    if (!this.fullscreenCamera) {
      this.fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.fullscreenCamera.position.z = 0;
    }

    if (!this.fullscreenQuad) {
      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        transparent: true,
      });

      this.fullscreenQuad = new THREE.Mesh(geo, mat);
      this.fullscreenQuad.frustumCulled = false;
      this.fullscreenScene.add(this.fullscreenQuad);
    }

    return {
      scene: this.fullscreenScene,
      camera: this.fullscreenCamera,
      quad: this.fullscreenQuad,
    };
  }

  private _renderTextureToTarget(
    texture: THREE.Texture,
    target: THREE.WebGLRenderTarget,
    w: number,
    h: number,
  ): void {
    const { scene, camera, quad } = this._getFullscreenObjects();

    let mat = quad.material as THREE.MeshBasicMaterial;
    if (!(mat instanceof THREE.MeshBasicMaterial)) {
      mat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        transparent: true,
      });
      quad.material = mat;
    }

    mat.map = texture;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;

    this.renderer.setRenderTarget(target);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.render(scene, camera);
  }

  private _renderMaterialToTarget(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
    w: number,
    h: number,
  ): void {
    const { scene, camera, quad } = this._getFullscreenObjects();

    quad.material = material;

    this.renderer.setRenderTarget(target);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.render(scene, camera);
  }

  // ── Material management ────────────────────────────────────

  /** Sync ShaderMaterial uniforms from current effect instance parameters */
  private _syncUniforms(mat: THREE.ShaderMaterial, effect: EffectInstance): void {
    for (const param of effect.parameters) {
      const uniform = (mat.uniforms as any)[param.uniform];
      if (!uniform) continue;
      const val = param.value;
      if (Array.isArray(val) && uniform.value?.set) {
        uniform.value.set(val[0], val[1]);
      } else if (typeof val === 'string' && param.type === 'color') {
        if (uniform.value instanceof THREE.Color) {
          uniform.value.set(val);
        } else {
          uniform.value = new THREE.Color(val);
        }
      } else if (typeof val === 'boolean') {
        uniform.value = val;
      } else {
        uniform.value = val;
      }
    }
    // Always sync uTime so animated effects work.
    if ((mat.uniforms as any).uTime !== undefined) {
      (mat.uniforms as any).uTime.value = this.currentTime;
    }
  }

  /**
   * Get or create a cached ShaderMaterial keyed by an arbitrary string.
   * Callers pass unique keys per (effect instance + sub-pass) so multi-pass
   * effects can cache multiple materials without collision.
   */
  private _getMaterialForKey(
    key: string,
    instance: EffectInstance,
    vertexShader: string | undefined,
    fragmentShader: string,
    extraUniforms?: Record<string, THREE.IUniform>,
  ): THREE.ShaderMaterial {
    const existing = this.materialCache.get(key);
    if (existing) return existing;

    // Build uniforms: base defaults + params + any extras from the module.
    const uniforms: Record<string, THREE.IUniform> = {
      uTexture: { value: null },
      uResolution: { value: new THREE.Vector2(this.layerWidth, this.layerHeight) },
      uTime: { value: this.currentTime },
    };
    for (const param of instance.parameters) {
      if (param.type === 'color') {
        uniforms[param.uniform] = { value: new THREE.Color(param.value as string) };
      } else if (param.type === 'vector2' && Array.isArray(param.value)) {
        uniforms[param.uniform] = { value: new THREE.Vector2(param.value[0], param.value[1]) };
      } else {
        uniforms[param.uniform] = { value: param.value };
      }
    }
    if (extraUniforms) {
      for (const [k, v] of Object.entries(extraUniforms)) {
        if (!(k in uniforms)) uniforms[k] = v;
      }
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader: vertexShader ?? DEFAULT_VERTEX_SHADER,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.materialCache.set(key, mat);
    return mat;
  }

  // ── Cleanup ────────────────────────────────────────────────

  dispose(): void {
    for (const mat of this.materialCache.values()) mat.dispose();
    this.materialCache.clear();

    this._disposeTargets();

    for (const rt of this._scratchTargets) rt.dispose();
    this._scratchTargets = [];
    this._scratchInUse = 0;

    if (this.fullscreenQuad) {
      this.fullscreenQuad.geometry.dispose();
      if (this.fullscreenQuad.material instanceof THREE.Material) {
        this.fullscreenQuad.material.dispose();
      }
      this.fullscreenQuad = null;
    }

    this.fullscreenScene = null;
    this.fullscreenCamera = null;
  }
}
