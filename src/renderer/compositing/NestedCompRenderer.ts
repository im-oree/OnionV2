import * as THREE from 'three';
import type { Composition } from '../../types/composition';
import type { Layer, CompData } from '../../types/layer';
import { LayerFactory } from '../layers/LayerFactory';
import { SceneManager } from '../SceneManager';

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
  private lastLayerRevision = -1;
  public readonly texture: THREE.Texture;
  public readonly width: number;
  public readonly height: number;

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
    for (const layer of layers) {
      // Skip comp-in-comp for now (deeper nesting handled separately by recursion in RenderPipeline)
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

  /** Render the nested comp to its texture. Call each frame. */
  render(): void {
    const prevTarget = this.webglRenderer.getRenderTarget();
    this.webglRenderer.setRenderTarget(this.renderTarget);
    this.webglRenderer.clear();
    this.webglRenderer.render(this.scene, this.camera);
    this.webglRenderer.setRenderTarget(prevTarget);
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
    this.sceneManager.dispose();
    this.renderTarget.dispose();
  }
}