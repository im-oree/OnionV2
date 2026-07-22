import * as THREE from 'three';
import type { Composition } from '../../types/composition';
import type { Layer, CompData } from '../../types/layer';
import { LayerFactory } from '../layers/LayerFactory';
import { SceneManager } from '../SceneManager';
import { PropertyBinder } from '../../animation/PropertyBinder';
import { useKeyframeStore } from '../../state/keyframeStore';
import type { RuntimeTransformOverride } from '../../animation/PropertyBinder';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import { EffectsRenderer } from '../effects/EffectsRenderer';

/**
 * Renders a nested composition into an offscreen render target and exposes it as a texture.
 * Recursive-safe: caller must ensure the composition graph has no cycles (use canNestComposition).
 */
export class NestedCompRenderer {
  private webglRenderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private sceneManager: SceneManager;
  private factory: LayerFactory;
  private layerRenderers = new Map<string, ReturnType<LayerFactory['create']>>();
  public readonly texture: THREE.Texture;
  public readonly width: number;
  public readonly height: number;
  private propertyBinder: PropertyBinder;
  private effectsRenderer: EffectsRenderer;
  private compId: string;
  private layerMap = new Map<string, Layer>();

  constructor(webglRenderer: THREE.WebGLRenderer, comp: Composition) {
    this.webglRenderer = webglRenderer;
    this.width = comp.width;
    this.height = comp.height;

    this.renderTarget = new THREE.WebGLRenderTarget(comp.width, comp.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.texture = this.renderTarget.texture;

    // Reuse SceneManager for the offscreen scene (grid/safezones/etc still work if needed)
    this.sceneManager = new SceneManager();
    this.sceneManager.applyComposition(comp.width, comp.height, comp.backgroundColor);
    // Hide overlays inside nested comps for perf
    this.sceneManager.grid.hide();
    this.sceneManager.safeZones.hide();

    this.scene = this.sceneManager.scene;
    this.factory = new LayerFactory(this.sceneManager);
    this.compId = comp.id;
    this.propertyBinder = new PropertyBinder(useKeyframeStore.getState().engine);
    this.effectsRenderer = new EffectsRenderer(this.webglRenderer);

    // Orthographic camera framing the comp exactly
    const hw = comp.width / 2;
    const hh = comp.height / 2;
    this.camera = new THREE.OrthographicCamera(-hw, hw, hh, -hh, -1000, 1000);
    this.camera.position.set(0, 0, 500);
  }

  /** Sync layers from the source composition */
  syncLayers(layers: Layer[]): void {
    const prevIds = new Set(this.layerRenderers.keys());
    const nextIds = new Set(layers.map(l => l.id));

    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        const r = this.layerRenderers.get(id);
        if (r) { this.factory.remove(r); this.layerRenderers.delete(id); }
      }
    }

    this.layerMap.clear();
    for (const l of layers) this.layerMap.set(l.id, l);

    for (const layer of layers) {
      // Skip comp-in-comp for now
      if (layer.type === 'comp') continue;
      let r = this.layerRenderers.get(layer.id);
      if (!r) {
        r = this.factory.create(layer);
        this.layerRenderers.set(layer.id, r);
      } else {
        r.updateTransform(layer.transform);
        r.updateOpacity(layer.opacity / 100);
        r.setVisible(layer.visible);
      }
    }
  }

  /** Update layer visibility based on local frame (respects startFrame/endFrame) */
  updateFrameVisibility(localFrame: number, layers: Layer[]): void {
    for (const layer of layers) {
      const r = this.layerRenderers.get(layer.id);
      if (!r) continue;
      const inRange = localFrame >= layer.startFrame && localFrame <= layer.endFrame;
      r.setVisible(layer.visible && inRange);
    }
  }

  /** Evaluate keyframes and apply overrides to nested layers */
  applyKeyframes(localFrame: number): void {
    const count = this.propertyBinder.evaluateFrame(this.compId, localFrame);
    if (count > 0 && this.propertyBinder.hasOverrides) {
      for (const [layerId, override] of this.propertyBinder.overrides) {
        const r = this.layerRenderers.get(layerId);
        if (!r) continue;
        const layer = this.layerMap.get(layerId);
        if (!layer) continue;
        const worldTransform = this._computeWorldTransform(
          {
            position: override.position ?? layer.transform.position,
            scale: override.scale ?? layer.transform.scale,
            rotation: override.rotation ?? layer.transform.rotation,
            anchorPoint: override.anchorPoint ?? layer.transform.anchorPoint,
          },
          layer.parentId,
        );
        r.updateTransform(worldTransform);
        if (override.opacity !== undefined) r.updateOpacity(override.opacity / 100);
      }
    }
  }

  /** Compute world transform by composing with parent transforms */
  private _computeWorldTransform(local: Layer['transform'], parentId: string | null | undefined): Layer['transform'] {
    if (!parentId) return local;
    const chain: Layer[] = [];
    let currentId: string | null | undefined = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const parent = this.layerMap.get(currentId);
      if (!parent) break;
      chain.push(parent);
      currentId = parent.parentId;
    }
    let worldPos = { x: local.position.x, y: local.position.y };
    let worldRot = local.rotation;
    let worldScale = { x: local.scale.x, y: local.scale.y };
    for (let i = chain.length - 1; i >= 0; i--) {
      const p = chain[i];
      const px = p.transform.position.x;
      const py = p.transform.position.y;
      const pr = p.transform.rotation;
      const psx = p.transform.scale.x / 100;
      const psy = p.transform.scale.y / 100;
      const prRad = THREE.MathUtils.degToRad(pr);
      const cos = Math.cos(prRad);
      const sin = Math.sin(prRad);
      const sx = worldPos.x * psx;
      const sy = worldPos.y * psy;
      worldPos = { x: px + sx * cos - sy * sin, y: py + sx * sin + sy * cos };
      worldRot += pr;
      worldScale = { x: worldScale.x * psx, y: worldScale.y * psy };
    }
    return {
      position: worldPos,
      scale: { x: worldScale.x * 100, y: worldScale.y * 100 },
      rotation: worldRot,
      anchorPoint: local.anchorPoint,
    };
  }

  /** Render the nested comp to its texture. Call each frame. */
  render(): void {
    // Apply effects BEFORE rendering the scene so effect quads are present
    // in each layer group when the scene renders.
    this._processEffects();

    const prevTarget = this.webglRenderer.getRenderTarget();
    this.webglRenderer.setRenderTarget(this.renderTarget);
    this.webglRenderer.clear();
    this.webglRenderer.render(this.scene, this.camera);
    this.webglRenderer.setRenderTarget(prevTarget);
  }

  /** Process effects on nested comp layers */
  private _processEffects(): void {
    const layerIds: string[] = [];
    for (const [id] of this.layerRenderers) {
      layerIds.push(id);
    }

    this.effectsRenderer.prepareFrame(layerIds);

    for (const [id, r] of this.layerRenderers) {
      const layer = this.layerMap.get(id);
      if (!layer) continue;

      const gw = (r as any).geometryWidth?.() ?? 0;
      const gh = (r as any).geometryHeight?.() ?? 0;

      if (this.effectsRenderer.hasEffects(id) && gw > 0 && gh > 0) {
        try {
          const success = this.effectsRenderer.renderLayer(id, r.mesh, gw, gh, r.group);
          if (success) {
            // Hide original mesh — the effect quad replaces it
            if (r.mesh.visible) r.mesh.visible = false;
          } else {
            // Effect rendering failed — show original mesh
            this.effectsRenderer.removeLayerEffects(id);
            r.mesh.visible = true;
          }
        } catch (err) {
          console.warn(`[NestedCompRenderer] effects error for ${id}:`, err);
          this.effectsRenderer.removeLayerEffects(id);
          r.mesh.visible = true;
        }
      } else {
        // No effects or zero-size — show original mesh
        if (!r.mesh.visible) r.mesh.visible = true;
        this.effectsRenderer.removeLayerEffects(id);
      }
    }
  }

  /** Compute the local frame for the nested comp given parent frame + layer data */
  static computeLocalFrame(
    parentFrame: number,
    layerStartFrame: number,
    nestedFps: number,
    parentFps: number,
    data: CompData,
    nestedTotalFrames: number,
  ): number {
    // Convert parent frames elapsed since layer start to seconds, then to nested frames
    const parentElapsedSec = Math.max(0, (parentFrame - layerStartFrame) / parentFps);
    const nestedRawFrame = parentElapsedSec * nestedFps * data.timeScale + data.timeOffset;
    if (data.loop && nestedTotalFrames > 0) {
      return ((nestedRawFrame % nestedTotalFrames) + nestedTotalFrames) % nestedTotalFrames;
    }
    return Math.min(nestedTotalFrames, Math.max(0, nestedRawFrame));
  }

  dispose(): void {
    for (const r of this.layerRenderers.values()) this.factory.remove(r);
    this.layerRenderers.clear();
    this.effectsRenderer.dispose();
    this.sceneManager.dispose();
    this.renderTarget.dispose();
  }
}