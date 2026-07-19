/**
 * EffectsRenderer — bridges the effect system into the rendering pipeline.
 * For each layer with active effects, replaces direct scene rendering with
 * FBO-based effect processing:
 *   1. Render only the layer mesh to a private FBO
 *   2. Process the FBO through EffectChain
 *   3. Composite the result as a textured quad at the layer's transform
 *
 * Layers without effects render normally (bypass).
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
  private _enabledEffects = new Set<string>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.privateScene = new THREE.Scene();
  }

  /** Prepare effects for a frame: check which layers have active effects */
  prepareFrame(layerIds: string[]): void {
    const store = useEffectsStore.getState();
    this._enabledEffects.clear();

    for (const id of layerIds) {
      const effects = store.effectsByLayer[id] ?? [];
      const active = effects.filter((e) => e.enabled);
      if (active.length > 0) {
        this._enabledEffects.add(id);
        // Ensure EffectChain exists for this layer
        if (!this.effectChains.has(id)) {
          this.effectChains.set(id, new EffectChain(this.renderer));
        }
      } else {
        // Remove effect quad if it exists (layer no longer has effects)
        this._removeEffectQuad(id);
        this.effectChains.get(id)?.dispose();
        this.effectChains.delete(id);
      }
    }

    // Clean up chains for layers no longer in the scene
    const layerSet = new Set(layerIds);
    for (const [id] of this.effectChains) {
      if (!layerSet.has(id)) {
        this.effectChains.get(id)?.dispose();
        this.effectChains.delete(id);
        this._removeEffectQuad(id);
      }
    }
  }

  /** Render a layer with effects to its FBO, process, and composite */
  renderLayer(
    layerId: string,
    layerMesh: THREE.Mesh,
    layerWidth: number,
    layerHeight: number,
    parentGroup: THREE.Group,
  ): void {
    if (!this._enabledEffects.has(layerId)) return;

    const chain = this.effectChains.get(layerId);
    if (!chain) return;

    const effects = useEffectsStore.getState().effectsByLayer[layerId] ?? [];
    const active = effects.filter((e) => e.enabled);
    if (active.length === 0) return;

    const w = Math.max(1, layerWidth);
    const h = Math.max(1, layerHeight);

    // Acquire FBO for initial layer render
    const layerFbo = fboPool.acquire(w, h);

    // Remove previous clone from private scene without disposing shared resources
    while (this.privateScene.children.length > 0) {
      this.privateScene.remove(this.privateScene.children[0]);
    }
    // Clone the layer mesh into the private scene for isolated rendering
    const meshClone = layerMesh.clone() as THREE.Mesh;
    // Share geometry and material references (not deep cloned)
    meshClone.geometry = layerMesh.geometry;
    meshClone.material = layerMesh.material;
    meshClone.position.copy(layerMesh.position);
    meshClone.scale.copy(layerMesh.scale);
    meshClone.rotation.copy(layerMesh.rotation);
    this.privateScene.add(meshClone);

    const cam = this._identityCamera();
    this.renderer.setRenderTarget(layerFbo);
    this.renderer.clear();
    this.renderer.render(this.privateScene, cam);

    // Process through EffectChain
    chain.setSource(layerFbo.texture, w, h);
    const resultTexture = chain.render(active);

    if (!resultTexture) {
      fboPool.release(layerFbo);
      return;
    }

    // Release initial FBO (chain now owns the result)
    fboPool.release(layerFbo);

    // Create or update a textured quad in the parent group at the layer's transform
    let quad = this.effectQuads.get(layerId);
    if (!quad) {
      const geo = new THREE.PlaneGeometry(
        layerWidth || w,
        layerHeight || h,
      );
      const mat = new THREE.MeshBasicMaterial({
        map: resultTexture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      quad = new THREE.Mesh(geo, mat);
      quad.name = `${layerId}_effect`;
      quad.frustumCulled = false;
      quad.renderOrder = 1;
      this.effectQuads.set(layerId, quad);
      parentGroup.add(quad);
    } else {
      // Update existing quad geometry size and texture
      const geo = new THREE.PlaneGeometry(
        layerWidth || w,
        layerHeight || h,
      );
      quad.geometry.dispose();
      quad.geometry = geo;
      (quad.material as THREE.MeshBasicMaterial).map = resultTexture;
      (quad.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }

    // Reset quad position/rotation within the group (group handles transform).
    // Only copy the mesh's scale so the effect quad matches the visual size.
    quad.position.set(0, 0, 0);
    quad.rotation.set(0, 0, 0);
    // Scale from mesh (which is percentage/100) — already applied via the parent group's
    // children, so don't double-apply. The quad geometry is already at layerWidth/layerHeight.
    quad.scale.set(1, 1, 1);
  }

  /** Hide/remove the effect quad, revealing the original mesh */
  removeLayerEffects(layerId: string): void {
    this._removeEffectQuad(layerId);
    this.effectChains.get(layerId)?.dispose();
    this.effectChains.delete(layerId);
    this._enabledEffects.delete(layerId);
  }

  /** Remove all effect resources */
  dispose(): void {
    for (const [id] of this.effectChains) {
      this._removeEffectQuad(id);
    }
    for (const chain of this.effectChains.values()) chain.dispose();
    this.effectChains.clear();
    this._enabledEffects.clear();
  }

  /** Check if a layer has active effects */
  hasEffects(layerId: string): boolean {
    return this._enabledEffects.has(layerId);
  }

  private _removeEffectQuad(layerId: string): void {
    const quad = this.effectQuads.get(layerId);
    if (quad) {
      quad.parent?.remove(quad);
      quad.geometry.dispose();
      if (quad.material instanceof THREE.Material) quad.material.dispose();
      this.effectQuads.delete(layerId);
    }
  }

  private _identityCamera(): THREE.OrthographicCamera {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
}
