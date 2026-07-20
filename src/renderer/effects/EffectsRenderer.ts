/**
 * EffectsRenderer — applies GPU effects to individual layer renderers.
 *
 * Stable per-layer pipeline:
 *   1. Render the layer mesh in LOCAL space into a temporary FBO.
 *   2. Process that texture through a persistent EffectChain.
 *   3. Display the persistent result on a quad inside the layer group.
 *
 * Important:
 * - The displayed texture is owned by EffectChain, not the temporary layer FBO.
 * - We restore render target / viewport / scissor after offscreen rendering.
 * - The effect quad copies the original mesh local transform so anchor/scale work.
 */
import * as THREE from 'three';
import { EffectChain } from './EffectChain';
import { fboPool } from './FBOPool';
import { useEffectsStore } from '../../state/effectsStore';

export class EffectsRenderer {
  private renderer: THREE.WebGLRenderer;
  private effectChains = new Map<string, EffectChain>();
  private effectQuads = new Map<string, THREE.Mesh>();
  private privateScene: THREE.Scene;
  private layerCam: THREE.OrthographicCamera;
  private enabledEffects = new Set<string>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.privateScene = new THREE.Scene();
    this.layerCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.layerCam.position.z = 10;
  }

  prepareFrame(layerIds: string[]): void {
    const store = useEffectsStore.getState();
    this.enabledEffects.clear();

    for (const id of layerIds) {
      const effects = store.effectsByLayer[id] ?? [];
      const active = effects.filter((e) => e.enabled);

      if (active.length > 0) {
        this.enabledEffects.add(id);
        if (!this.effectChains.has(id)) {
          this.effectChains.set(id, new EffectChain(this.renderer));
        }
      } else {
        this.removeLayerEffects(id);
      }
    }

    const live = new Set(layerIds);
    for (const [id, chain] of this.effectChains) {
      if (!live.has(id)) {
        chain.dispose();
        this.effectChains.delete(id);
        this._removeEffectQuad(id);
        this.enabledEffects.delete(id);
      }
    }
  }

  renderLayer(
    layerId: string,
    layerMesh: THREE.Mesh,
    layerWidth: number,
    layerHeight: number,
    parentGroup: THREE.Group,
  ): boolean {
    if (!this.enabledEffects.has(layerId)) return false;

    const chain = this.effectChains.get(layerId);
    if (!chain) return false;

    const effects = useEffectsStore.getState().effectsByLayer[layerId] ?? [];
    const active = effects.filter((e) => e.enabled);
    if (active.length === 0) return false;

    const w = Math.max(1, Math.ceil(layerWidth));
    const h = Math.max(1, Math.ceil(layerHeight));

    const oldTarget = this.renderer.getRenderTarget();
    const oldViewport = new THREE.Vector4();
    const oldScissor = new THREE.Vector4();
    this.renderer.getViewport(oldViewport);
    this.renderer.getScissor(oldScissor);
    const oldScissorTest = this.renderer.getScissorTest();

    const layerFbo = fboPool.acquire(w, h);

    try {
      this._clearPrivateScene();

      /**
       * Render source layer in LOCAL coordinates.
       *
       * We do NOT use the layer group's world transform here.
       * Effects should process the raw layer pixels first, then the final
       * textured quad receives the same local transform as the original mesh.
       */
      const meshClone = new THREE.Mesh(layerMesh.geometry, layerMesh.material);
      meshClone.name = `${layerId}_effect_source`;
      meshClone.frustumCulled = false;
      meshClone.visible = true;

      // Render the raw geometry centered in the local FBO.
      meshClone.position.set(0, 0, 0);
      meshClone.rotation.set(0, 0, 0);
      meshClone.scale.set(1, 1, 1);
      meshClone.renderOrder = 0;

      this.privateScene.add(meshClone);

      this.layerCam.left = -w / 2;
      this.layerCam.right = w / 2;
      this.layerCam.top = h / 2;
      this.layerCam.bottom = -h / 2;
      this.layerCam.near = -100;
      this.layerCam.far = 100;
      this.layerCam.position.set(0, 0, 10);
      this.layerCam.lookAt(0, 0, 0);
      this.layerCam.updateProjectionMatrix();

      this.renderer.setRenderTarget(layerFbo);
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissor(0, 0, w, h);
      this.renderer.setScissorTest(false);
      this.renderer.clearColor();
      this.renderer.render(this.privateScene, this.layerCam);

      chain.setSource(layerFbo.texture, w, h);
      const resultTexture = chain.render(active);

      if (!resultTexture) return false;

      let quad = this.effectQuads.get(layerId);

      // Use the ORIGINAL mesh's geometry size so the effect quad
      // occupies exactly the same rectangle as the source layer.
      const meshGeo = layerMesh.geometry as THREE.PlaneGeometry;
      let geoW = w;
      let geoH = h;
      if (meshGeo && meshGeo.parameters) {
        geoW = meshGeo.parameters.width || w;
        geoH = meshGeo.parameters.height || h;
      }

      if (!quad) {
        const geo = new THREE.PlaneGeometry(geoW, geoH);
        const mat = new THREE.MeshBasicMaterial({
          map: resultTexture,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          premultipliedAlpha: false,
        });

        quad = new THREE.Mesh(geo, mat);
        quad.name = `${layerId}_effect_result`;
        quad.frustumCulled = false;
        quad.renderOrder = layerMesh.renderOrder + 0.01;

        this.effectQuads.set(layerId, quad);
        parentGroup.add(quad);
      } else {
        const qgeo = quad.geometry as THREE.PlaneGeometry;
        if (
          Math.abs(qgeo.parameters.width - geoW) > 0.5 ||
          Math.abs(qgeo.parameters.height - geoH) > 0.5
        ) {
          quad.geometry.dispose();
          quad.geometry = new THREE.PlaneGeometry(geoW, geoH);
        }

        const mat = quad.material as THREE.MeshBasicMaterial;
        mat.map = resultTexture;
        mat.needsUpdate = true;
      }

      /**
       * Match the original mesh's local transform.
       *
       * BaseLayerRenderer stores:
       * - group.position/group.rotation = layer position/rotation
       * - mesh.position = anchor offset
       * - mesh.scale = layer scale
       *
       * So the effect quad must copy mesh local position/scale/rotation.
       */
      quad.position.copy(layerMesh.position);
      quad.rotation.copy(layerMesh.rotation);
      quad.scale.copy(layerMesh.scale);
      quad.visible = true;
      quad.renderOrder = layerMesh.renderOrder + 0.01;

      return true;
    } catch (err) {
      console.warn(`[EffectsRenderer] renderLayer failed for ${layerId}:`, err);
      return false;
    } finally {
      fboPool.release(layerFbo);

      this.renderer.setRenderTarget(oldTarget);
      this.renderer.setViewport(oldViewport);
      this.renderer.setScissor(oldScissor);
      this.renderer.setScissorTest(oldScissorTest);

      this._clearPrivateScene();
    }
  }

  removeLayerEffects(layerId: string): void {
    this._removeEffectQuad(layerId);

    const chain = this.effectChains.get(layerId);
    if (chain) {
      chain.dispose();
      this.effectChains.delete(layerId);
    }

    this.enabledEffects.delete(layerId);
  }

  hasEffects(layerId: string): boolean {
    return this.enabledEffects.has(layerId);
  }

  dispose(): void {
    for (const id of Array.from(this.effectQuads.keys())) {
      this._removeEffectQuad(id);
    }

    for (const chain of this.effectChains.values()) {
      chain.dispose();
    }

    this.effectChains.clear();
    this.enabledEffects.clear();
    this._clearPrivateScene();
  }

  private _removeEffectQuad(layerId: string): void {
    const quad = this.effectQuads.get(layerId);
    if (!quad) return;

    quad.parent?.remove(quad);
    quad.geometry.dispose();

    if (quad.material instanceof THREE.Material) {
      /**
       * Do NOT dispose mat.map here.
       * The texture belongs to EffectChain's persistent render target.
       */
      quad.material.dispose();
    }

    this.effectQuads.delete(layerId);
  }

  private _clearPrivateScene(): void {
    for (let i = this.privateScene.children.length - 1; i >= 0; i--) {
      this.privateScene.remove(this.privateScene.children[i]);
    }
  }
}