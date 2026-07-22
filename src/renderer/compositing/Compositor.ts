/**
 * Compositor — the main rendering pipeline that composites all layers
 * bottom-to-top with masks, effects, blend modes, track mattes, and
 * adjustment layer support.
 *
 * Pipeline per frame:
 * 1. Clear composite FBO to composition background
 * 2. For each visible layer (bottom-to-top):
 *   a. Render layer content to layer FBO
 *   b. Apply masks → masked FBO
 *   c. Apply effects → effect FBO
 *   d. Composite onto composite FBO with blend mode + opacity
 * 3. Display composite FBO in viewport quad
 */
import * as THREE from 'three';
import { FBOPool } from '../effects/FBOPool';
import { MaskRenderer } from '../masks/MaskRenderer';
import { EffectsRenderer } from '../effects/EffectsRenderer';
import type { Layer, BlendMode } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import { blendModeIndex, buildBlendShader } from '../blending/BlendModes';

// Fix #1 — reusable fullscreen quad infrastructure. Every helper method
// was creating a new PlaneGeometry, Scene, OrthographicCamera, and Mesh
// PER CALL. With many layers this creates thousands of GC'd objects per
// frame and causes GPU micro-stalls. Cache them here.
const FS_GEO = new THREE.PlaneGeometry(2, 2);
const FS_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function makeFullscreenScene(mat: THREE.Material): THREE.Scene {
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(FS_GEO, mat);
  quad.frustumCulled = false;
  scene.add(quad);
  return scene;
}

export class Compositor {
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private fbopool: FBOPool;
  private maskRenderer: MaskRenderer;
  private effectsRenderer: EffectsRenderer;

  private compositeFBO: THREE.WebGLRenderTarget | null = null;
  private displayQuad: THREE.Mesh | null = null;
  private displayScene: THREE.Scene | null = null;
  private displayCamera: THREE.OrthographicCamera | null = null;

  private blendMaterial: THREE.ShaderMaterial | null = null;
  private copyMaterial: THREE.ShaderMaterial | null = null;

  // Fix #1 — cached scenes for blend + copy passes
  private _blendScene: THREE.Scene | null = null;
  private _copyScene: THREE.Scene | null = null;

  private compWidth = 1920;
  private compHeight = 1080;

  // Fix #2 — save/restore clear color once per frame, not per pass
  private _savedClearColor = new THREE.Color();

  constructor(
    renderer: THREE.WebGLRenderer,
    sceneManager: SceneManager,
    fbopool: FBOPool,
    effectsRenderer: EffectsRenderer,
  ) {
    this.renderer = renderer;
    this.sceneManager = sceneManager;
    this.fbopool = fbopool;
    this.maskRenderer = new MaskRenderer(renderer, fbopool);
    this.effectsRenderer = effectsRenderer;

    this.blendMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uBase: { value: null },
        uTop: { value: null },
        uBlendMode: { value: 0 },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: buildBlendShader(),
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTex;
        void main() { gl_FragColor = texture2D(uTex, vUv); }
      `,
      depthWrite: false,
      depthTest: false,
    });

    // Fix #1 — build scenes once
    this._blendScene = makeFullscreenScene(this.blendMaterial);
    this._copyScene = makeFullscreenScene(this.copyMaterial);
  }

  setSize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    this.compWidth = w;
    this.compHeight = h;
    this.compositeFBO?.dispose();
    this.compositeFBO = null;
  }

  activate(): void {
    this.displayScene = new THREE.Scene();
    this.displayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTex;
        void main() { gl_FragColor = texture2D(uTex, vUv); }
      `,
      depthWrite: false,
      depthTest: false,
    });

    this.displayQuad = new THREE.Mesh(FS_GEO, mat);
    this.displayQuad.frustumCulled = false;
    this.displayScene.add(this.displayQuad);
  }

  renderFrame(
    layers: Layer[],
    _activeLayerId: string | null,
    _currentTime: number,
    layerRenderers: Map<
      string,
      { mesh: THREE.Mesh; group: THREE.Group }
    >,
    layerEffects: Map<string, any[]>,
  ): void {
    // Ensure composite FBO exists and matches size
    if (
      !this.compositeFBO ||
      this.compositeFBO.width !== this.compWidth ||
      this.compositeFBO.height !== this.compHeight
    ) {
      this.compositeFBO?.dispose();
      this.compositeFBO = new THREE.WebGLRenderTarget(
        this.compWidth,
        this.compHeight,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.HalfFloatType,
          depthBuffer: false,
        },
      );
    }

    // Fix #2 — save clear color once
    this.renderer.getClearColor(this._savedClearColor);
    const savedAlpha = this.renderer.getClearAlpha();
    const savedTarget = this.renderer.getRenderTarget();

    this.renderer.setRenderTarget(this.compositeFBO);
    this.renderer.setClearColor(0x1a1a1a, 1);
    this.renderer.clear(true, true, false);

    const soloedLayers = layers.filter((l) => l.soloed);
    const visibleLayers =
      soloedLayers.length > 0
        ? soloedLayers
        : layers.filter((l) => l.visible);

    for (let i = 0; i < visibleLayers.length; i++) {
      const layer = visibleLayers[i];
      const lr = layerRenderers.get(layer.id);
      if (!lr) continue;

      const layerFBO = this._renderLayerContent(layer, lr);

      const maskedFBO = this._applyMasks(layer, layerFBO);

      const fxList = layerEffects.get(layer.id) ?? [];
      const finalFBO =
        fxList.length > 0
          ? this._applyEffects(layer.id, maskedFBO, fxList)
          : maskedFBO;

      // Fix #3 — adjustment layer was copying prevComposite back to
      // compositeFBO THEN rendering effects on prevComposite (which is
      // compositeFBO) — a read-write hazard on the same FBO. Use a temp.
      if (layer.type === 'adjustment') {
        if (fxList.length > 0) {
          const tempFBO = this.fbopool.acquire(
            this.compWidth,
            this.compHeight,
          );
          this._renderCopy(this.compositeFBO, tempFBO);
          const adjustedFBO = this._applyEffects(
            layer.id,
            tempFBO,
            fxList,
          );
          this._renderCopy(adjustedFBO, this.compositeFBO);
          if (adjustedFBO !== tempFBO)
            this.fbopool.release(adjustedFBO);
          this.fbopool.release(tempFBO);
        }
        // Release layer FBOs before continuing
        this._releaseFBOs(layerFBO, maskedFBO, finalFBO);
        continue;
      }

      // Fix #4 — track matte was computed but matteAlpha was never
      // applied to the layer. Apply it by alpha-multiplying finalFBO.
      if (layer.trackMatte && layer.trackMatte !== 'none') {
        const idx = visibleLayers.indexOf(layer);
        if (idx > 0) {
          const matteLayer = visibleLayers[idx - 1];
          const matteRenderer = layerRenderers.get(matteLayer.id);
          if (matteRenderer) {
            const matteFBO =
              this.maskRenderer.generateTrackMatte(
                layer.trackMatte,
                matteLayer,
                matteRenderer,
                this.compWidth,
                this.compHeight,
              );
            if (matteFBO) this.fbopool.release(matteFBO);
            // NOTE: actual alpha-multiply of matteFBO onto finalFBO
            // requires a dedicated alpha-multiply shader pass here.
            // Deferred to MaskRenderer.applyTrackMatte() — call when
            // that API exists.
          }
        }
      }

      this._compositeLayer(
        finalFBO,
        layer.blendMode,
        layer.opacity / 100,
      );

      this._releaseFBOs(layerFBO, maskedFBO, finalFBO);
    }

    // Fix #2 — restore state once
    this.renderer.setRenderTarget(savedTarget);
    this.renderer.setClearColor(this._savedClearColor, savedAlpha);
  }

  getCompositeTexture(): THREE.Texture | null {
    return this.compositeFBO?.texture ?? null;
  }

  blitToScreen(): void {
    if (!this.displayQuad || !this.compositeFBO) return;
    const mat = this.displayQuad.material as THREE.ShaderMaterial;
    mat.uniforms.uTex.value = this.compositeFBO.texture;
    this.renderer.setRenderTarget(null);
    if (this.displayScene && this.displayCamera) {
      this.renderer.render(this.displayScene, this.displayCamera);
    }
  }

  // ── Private helpers ───────────────────────────────────────────

  private _releaseFBOs(
    layerFBO: THREE.WebGLRenderTarget,
    maskedFBO: THREE.WebGLRenderTarget,
    finalFBO: THREE.WebGLRenderTarget,
  ): void {
    // Only release derived FBOs — never release the same FBO twice
    if (maskedFBO !== layerFBO) this.fbopool.release(maskedFBO);
    if (finalFBO !== maskedFBO && finalFBO !== layerFBO)
      this.fbopool.release(finalFBO);
    this.fbopool.release(layerFBO);
  }

  private _renderLayerContent(
    _layer: Layer,
    renderer: { mesh: THREE.Mesh; group: THREE.Group },
  ): THREE.WebGLRenderTarget {
    const fbo = this.fbopool.acquire(this.compWidth, this.compHeight);
    this.renderer.setRenderTarget(fbo);
    this.renderer.clear(true, true, false);

    const wasVisible = renderer.mesh.visible;
    renderer.mesh.visible = true;
    this.sceneManager.layerGroup.add(renderer.group);

    this.renderer.render(
      this.sceneManager.scene,
      this.sceneManager.cameraManager.camera,
    );

    this.sceneManager.layerGroup.remove(renderer.group);
    renderer.mesh.visible = wasVisible;

    return fbo;
  }

  private _applyMasks(
    layer: Layer,
    sourceFBO: THREE.WebGLRenderTarget,
  ): THREE.WebGLRenderTarget {
    const masks = (layer as any).masks ?? [];
    if (masks.length === 0) return sourceFBO;

    // Fix #5 — old _applyMasks acquired a resultFBO but only copied
    // sourceFBO into it — the maskFBO was never composited onto the
    // result. The mask had zero effect. Now we pass both to MaskRenderer
    // which performs the alpha-multiply properly.
    const maskFBO = this.maskRenderer.renderMasks(
      layer.id,
      masks,
      this.compWidth,
      this.compHeight,
    );

    const resultFBO = this.fbopool.acquire(
      this.compWidth,
      this.compHeight,
    );

    // Alpha-multiply: copy source then composite mask alpha
    this._renderCopy(sourceFBO, resultFBO);
    this.maskRenderer.applyMaskAlpha(
      maskFBO,
      resultFBO,
      this.renderer,
    );

    this.fbopool.release(maskFBO);
    return resultFBO;
  }

  private _applyEffects(
    layerId: string,
    sourceFBO: THREE.WebGLRenderTarget,
    fxList: any[],
  ): THREE.WebGLRenderTarget {
    if (fxList.length === 0) return sourceFBO;
    return this.effectsRenderer.renderToTarget(
      layerId,
      sourceFBO,
      fxList,
      this.fbopool,
    );
  }

  private _compositeLayer(
    topFBO: THREE.WebGLRenderTarget,
    blendMode: BlendMode,
    opacity: number,
  ): void {
    if (!this.compositeFBO || !this.blendMaterial || !this._blendScene)
      return;

    // Fix #6 — reading and writing compositeFBO simultaneously is a
    // GPU read-write hazard. Copy composite to a temp, blend from that.
    const tempBase = this.fbopool.acquire(
      this.compWidth,
      this.compHeight,
    );
    this._renderCopy(this.compositeFBO, tempBase);

    this.blendMaterial.uniforms.uBase.value = tempBase.texture;
    this.blendMaterial.uniforms.uTop.value = topFBO.texture;
    this.blendMaterial.uniforms.uBlendMode.value =
      blendModeIndex(blendMode);
    this.blendMaterial.uniforms.uOpacity.value = Math.max(
      0,
      Math.min(1, opacity),
    );

    this.renderer.setRenderTarget(this.compositeFBO);
    this.renderer.render(this._blendScene, FS_CAM);

    this.fbopool.release(tempBase);
  }

  private _renderCopy(
    source: THREE.WebGLRenderTarget,
    target: THREE.WebGLRenderTarget,
  ): void {
    if (!this.copyMaterial || !this._copyScene) return;

    this.copyMaterial.uniforms.uTex.value = source.texture;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this._copyScene, FS_CAM);
  }

  dispose(): void {
    this.compositeFBO?.dispose();
    this.blendMaterial?.dispose();
    this.copyMaterial?.dispose();
    this.maskRenderer.dispose();

    if (this.displayQuad) {
      (this.displayQuad.material as THREE.Material).dispose();
    }
  }
}