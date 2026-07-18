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
import { BLEND_MODES, blendModeIndex, buildBlendShader } from '../blending/BlendModes';

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

  private compWidth = 1920;
  private compHeight = 1080;

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

    // Build blend shader once
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

    // Copy material (straight pass-through)
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv; uniform sampler2D uTex;
        void main() { gl_FragColor = texture2D(uTex, vUv); }
      `,
      depthWrite: false,
      depthTest: false,
    });
  }

  /** Set composition size */
  setSize(w: number, h: number): void {
    this.compWidth = w;
    this.compHeight = h;
    this.compositeFBO = null; // recreate on next render
  }

  /** Enter compositor mode — replaces scene rendering with compositor pipeline */
  activate(): void {
    // Create display scene for compositor output
    this.displayScene = new THREE.Scene();
    this.displayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv; uniform sampler2D uTex;
        void main() { gl_FragColor = texture2D(uTex, vUv); }
      `,
      depthWrite: false, depthTest: false,
    });
    this.displayQuad = new THREE.Mesh(geo, mat);
    this.displayScene.add(this.displayQuad);
  }

  /** Render one frame of the composition */
  renderFrame(
    layers: Layer[],
    activeLayerId: string | null,
    currentTime: number,
    layerRenderers: Map<string, { mesh: THREE.Mesh; group: THREE.Group }>,
    layerEffects: Map<string, any[]>,
  ): void {
    if (!this.compositeFBO || this.compositeFBO.width !== this.compWidth || this.compositeFBO.height !== this.compHeight) {
      this.compositeFBO?.dispose();
      this.compositeFBO = new THREE.WebGLRenderTarget(this.compWidth, this.compHeight, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      });
    }

    this.renderer.setRenderTarget(this.compositeFBO);
    this.renderer.setClearColor(0x1a1a1a, 1);
    this.renderer.clear(true, true, true);

    // Check if any layer has solo enabled
    const soloedLayers = layers.filter((l) => l.soloed);
    const visibleLayers = soloedLayers.length > 0
      ? layers.filter((l) => l.soloed)
      : layers.filter((l) => l.visible);

    // Track accumulated composite for adjustment layers and track mattes
    let prevComposite: THREE.WebGLRenderTarget | null = null;

    for (const layer of visibleLayers) {
      const renderer = layerRenderers.get(layer.id);
      if (!renderer) continue;

      // 1. Render layer content to its own FBO
      const layerFBO = this._renderLayerContent(layer, renderer);

      // 2. Apply masks
      const maskedFBO = this._applyMasks(layer, layerFBO);

      // 3. Apply effects
      const fxList = layerEffects.get(layer.id) ?? [];
      const finalFBO = fxList.length > 0
        ? this._applyEffects(layer.id, maskedFBO, fxList)
        : maskedFBO;

      // 4. Handle adjustment layers
      if (layer.type === 'adjustment') {
        if (prevComposite) {
          this._renderCopy(prevComposite, this.compositeFBO);
          // Apply adjustment layer effects to the composite so far
          if (fxList.length > 0) {
            const adjustedFBO = this._applyEffects(layer.id, prevComposite, fxList);
            this._renderCopy(adjustedFBO, this.compositeFBO);
          }
        }
        continue;
      }

      // 5. Handle track mattes
      let matteAlpha: THREE.WebGLRenderTarget | null = null;
      if (layer.trackMatte && layer.trackMatte !== 'none') {
        // Find the layer above as matte source
        const idx = visibleLayers.indexOf(layer);
        if (idx > 0) {
          const matteLayer = visibleLayers[idx - 1];
          const matteRenderer = layerRenderers.get(matteLayer.id);
          if (matteRenderer) {
            matteAlpha = this.maskRenderer.generateTrackMatte(layer.trackMatte, matteLayer, matteRenderer, this.compWidth, this.compHeight);
          }
        }
      }

      // 6. Composite onto accumulated composite with blend mode
      this._compositeLayer(finalFBO, layer.blendMode, layer.opacity / 100);

      // 7. Store for next iteration (adjustment layers, preserve transparency)
      prevComposite = this.compositeFBO;

      // Release temporary FBOs
      if (layerFBO !== maskedFBO) this.fbopool.release(maskedFBO);
      if (finalFBO !== maskedFBO) this.fbopool.release(finalFBO);
      this.fbopool.release(layerFBO);
    }

    // Restore render target
    this.renderer.setRenderTarget(null);
  }

  /** Get the final composited texture for viewport display */
  getCompositeTexture(): THREE.Texture | null {
    return this.compositeFBO?.texture ?? null;
  }

  /** Copy composite to viewport quad */
  blitToScreen(): void {
    if (!this.displayQuad || !this.compositeFBO) return;
    const mat = this.displayQuad.material as THREE.ShaderMaterial;
    mat.uniforms.uTex.value = this.compositeFBO.texture;
    this.renderer.setRenderTarget(null);
    if (this.displayScene && this.displayCamera) {
      this.renderer.render(this.displayScene, this.displayCamera);
    }
  }

  private _renderLayerContent(
    layer: Layer,
    renderer: { mesh: THREE.Mesh; group: THREE.Group },
  ): THREE.WebGLRenderTarget {
    const fbo = this.fbopool.acquire(this.compWidth, this.compHeight);
    this.renderer.setRenderTarget(fbo);
    this.renderer.clear(true, true, true);

    // Temporarily add mesh to scene and render
    const wasVisible = renderer.mesh.visible;
    renderer.mesh.visible = true;
    this.sceneManager.layerGroup.add(renderer.mesh);
    this.renderer.render(this.sceneManager.scene, this.sceneManager.cameraManager.camera);
    this.sceneManager.layerGroup.remove(renderer.mesh);
    renderer.mesh.visible = wasVisible;

    return fbo;
  }

  private _applyMasks(layer: Layer, sourceFBO: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget {
    // Check if layer has masks
    const masks = (layer as any).masks ?? [];
    if (masks.length === 0) return sourceFBO;

    // Generate mask alpha FBO
    const maskFBO = this.maskRenderer.renderMasks(layer.id, masks, this.compWidth, this.compHeight);

    // Multiply source alpha by mask alpha
    const resultFBO = this.fbopool.acquire(this.compWidth, this.compHeight);
    this.renderer.setRenderTarget(resultFBO);
    this.renderer.clear(true, true, true);

    const mat = this.copyMaterial!;
    (mat.uniforms.uTex as any).value = sourceFBO.texture;
    // Apply mask alpha via a custom blend — for now use a simple fullscreen quad
    // In production, this would use a proper alpha-multiply shader
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeo, mat);
    const scene = new THREE.Scene();
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer.render(scene, cam);
    quadGeo.dispose();

    this.fbopool.release(maskFBO);
    return resultFBO;
  }

  private _applyEffects(layerId: string, sourceFBO: THREE.WebGLRenderTarget, fxList: any[]): THREE.WebGLRenderTarget {
    if (fxList.length === 0) return sourceFBO;
    return this.effectsRenderer.renderToTarget(layerId, sourceFBO, fxList, this.fbopool);
  }

  private _compositeLayer(topFBO: THREE.WebGLRenderTarget, blendMode: BlendMode, opacity: number): void {
    const mat = this.blendMaterial!;
    mat.uniforms.uBase.value = this.compositeFBO!.texture;
    mat.uniforms.uTop.value = topFBO.texture;
    mat.uniforms.uBlendMode.value = blendModeIndex(blendMode);
    mat.uniforms.uOpacity.value = opacity;

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeo, mat);
    const scene = new THREE.Scene();
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer.setRenderTarget(this.compositeFBO!);
    this.renderer.render(scene, cam);
    quadGeo.dispose();
  }

  private _renderCopy(source: THREE.WebGLRenderTarget, target: THREE.WebGLRenderTarget): void {
    const mat = this.copyMaterial!;
    mat.uniforms.uTex.value = source.texture;
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeo, mat);
    const scene = new THREE.Scene();
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer.setRenderTarget(target);
    this.renderer.render(scene, cam);
    quadGeo.dispose();
  }

  dispose(): void {
    this.compositeFBO?.dispose();
    this.displayScene?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
    this.blendMaterial?.dispose();
    this.copyMaterial?.dispose();
    this.maskRenderer.dispose();
  }
}
