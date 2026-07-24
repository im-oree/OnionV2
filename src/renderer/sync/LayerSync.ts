import * as THREE from 'three';
import type { Layer } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import { LayerFactory } from '../layers/LayerFactory';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import type { RuntimeOverrides } from '../../animation/PropertyBinder';
import { useCompositionStore } from '../../state/compositionStore';
import { isFrameInLayer } from '../../types/layer';
import { applyBlendModeToMaterial } from '../blending/ApplyBlendMode';
import { useMaskStore } from '../../state/maskStore';
import { MaskCompositor } from '../compositing/MaskCompositor';

export class LayerSync {
  private factory: LayerFactory;
  private sceneManager: SceneManager;
  private renderers = new Map<string, BaseLayerRenderer>();
  private prevLayers: Layer[] = [];
  private _runtimeOverridesActive = false;
  /** Stores the last-applied LOCAL transform override for each layer (used for child computation). */
  private _localOverrides = new Map<string, Layer['transform']>();

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.factory = new LayerFactory(sceneManager);
  }

  setRuntimeOverridesActive(active: boolean): void { this._runtimeOverridesActive = active; }
  get isRuntimeOverridesActive(): boolean { return this._runtimeOverridesActive; }

  sync(layers: Layer[]): void {
    const prevMap = new Map<string, Layer>();
    for (const l of this.prevLayers) prevMap.set(l.id, l);
    const nextMap = new Map<string, Layer>();
    for (const l of layers) nextMap.set(l.id, l);

    // Remove renderers for layers that no longer exist.
    // Only clean up "orphan" groups from layerGroup for REMOVED layers —
    // never for live layers. The old code ran orphan cleanup on every
    // prev-map entry, which nuked the currently-live renderer's group
    // (since BaseLayerRenderer sets group.name = layer.id).
    for (const [id] of prevMap) {
      if (!nextMap.has(id)) {
        const r = this.renderers.get(id);
        if (r) {
          this.factory.remove(r);
          this.renderers.delete(id);
        }

        // Clean up any stragglers with this id (e.g. from older systems)
        const orphans = this.sceneManager.layerGroup.children.filter(
          (child: THREE.Object3D) => child.name === id,
        );
        for (const orphan of orphans) {
          this.sceneManager.layerGroup.remove(orphan);
          orphan.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((m: THREE.Material) => m.dispose());
              } else if (child.material instanceof THREE.Material) {
                child.material.dispose();
              }
            }
          });
        }
      }
    }

    for (const layer of layers) {
      const prev = prevMap.get(layer.id);
      if (!prev) {
        // New layer — create renderer (LayerFactory.create() adds group to layerGroup)
        let r = this.renderers.get(layer.id);
        if (!r) {
          r = this.factory.create(layer);
          this.renderers.set(layer.id, r);
        }
        // Safety: ensure the renderer's group is actually attached to the scene.
        // If a previous sync (or bad orphan cleanup) removed it, re-add it.
        if (r.group.parent !== this.sceneManager.layerGroup) {
          this.sceneManager.layerGroup.add(r.group);
        }
        const mat = r.mesh.material as THREE.Material;
        if (mat && layer.blendMode && layer.blendMode !== 'normal') {
          applyBlendModeToMaterial(mat, layer.blendMode);
        }
      } else {
        this._updateRenderer(layer.id, prev, layer);
        // Safety re-attach on every sync in case anything removed the group.
        const r = this.renderers.get(layer.id);
        if (r && r.group.parent !== this.sceneManager.layerGroup) {
          this.sceneManager.layerGroup.add(r.group);
        }
      }
    }
    this._updateZOrder(layers);

    // Apply masks to canvas-based renderers
    this._applyMasks(layers);

    // Second pass: recompute world transforms for ALL parented layers.
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);
    for (const layer of layers) {
      if (!layer.parentId) continue;
      const r = this.renderers.get(layer.id);
      if (!r) continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
    }

    this.prevLayers = layers;
  }

  private _getLayers(): Layer[] {
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId ? cs.compositions.find(c => c.id === cs.activeCompositionId) : null;
    return comp?.layers ?? this.prevLayers;
  }

  applyRuntimeOverrides(overrides: RuntimeOverrides): void {
    this._localOverrides.clear();

    const layers = this._getLayers();
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);

    for (const [layerId, override] of overrides) {
      const r = this.renderers.get(layerId); if (!r) continue;
      const layer = layers.find(l => l.id === layerId); if (!layer) continue;
      const localTransform = {
        position: override.position ?? layer.transform.position,
        scale: override.scale ?? layer.transform.scale,
        rotation: override.rotation ?? layer.transform.rotation,
        anchorPoint: override.anchorPoint ?? layer.transform.anchorPoint,
      };
      const worldTransform = this._computeWorldTransform(localTransform, layer.parentId, layerMap);
      this._localOverrides.set(layerId, localTransform);
      r.updateTransform(worldTransform);
      if (override.opacity !== undefined) r.updateOpacity(override.opacity / 100);
    }

    for (const layer of layers) {
      if (!layer.parentId) continue;
      if (overrides.has(layer.id)) continue;
      const r = this.renderers.get(layer.id);
      if (!r) continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
    }
  }

  restoreFromOverrides(): void {
    const layers = this._getLayers();
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);
    for (const layer of layers) {
      const r = this.renderers.get(layer.id); if (!r) continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
      r.updateOpacity(layer.opacity / 100);
    }
  }

  updateFrameVisibility(currentFrame: number): void {
    const layers = this._getLayers();
    const hasSolo = layers.some(l => l.soloed);
    const wireframe = !!(window as any).__wireframeMode;
    for (const layer of layers) {
      const r = this.renderers.get(layer.id); if (!r) continue;
      if (layer.type === 'adjustment' || layer.type === 'camera' || layer.type === 'light' || layer.type === 'null') { r.setVisible(false); continue; }
      const inFrame = isFrameInLayer(layer, currentFrame);
      const visible = layer.visible && inFrame && (hasSolo ? !!layer.soloed : true);
      r.setVisible(visible);
      if (r.setWireframe) r.setWireframe(wireframe);
    }
  }

  recomputeWorldTransforms(layers: Layer[]): void {
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);
    for (const layer of layers) {
      if (!layer.parentId) continue;
      const r = this.renderers.get(layer.id);
      if (!r) continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
    }
  }

  clear(): void {
    for (const r of this.renderers.values()) r.dispose();
    this.renderers.clear(); this.prevLayers = []; this.factory.clearAll();
  }

  getRenderer(layerId: string): BaseLayerRenderer | undefined { return this.renderers.get(layerId); }
  getAllRenderers(): Map<string, BaseLayerRenderer> { return this.renderers; }

  private _updateRenderer(layerId: string, prev: Layer, next: Layer): void {
    const r = this.renderers.get(layerId); if (!r) return;

    if (!this._runtimeOverridesActive) {
      if (this._txChanged(prev.transform, next.transform) || prev.parentId !== next.parentId) {
        const layerMap = new Map<string, Layer>();
        for (const l of this.prevLayers) layerMap.set(l.id, l);
        const worldTransform = this._computeWorldTransform(next.transform, next.parentId, layerMap);
        r.updateTransform(worldTransform);
      }
      if (prev.opacity !== next.opacity) r.updateOpacity(next.opacity / 100);
    }
    if (prev.visible !== next.visible) r.setVisible(next.visible);

    if (prev.blendMode !== next.blendMode) {
      const mat = r.mesh.material as THREE.Material;
      if (mat) applyBlendModeToMaterial(mat, next.blendMode);
    }

    if (prev.data === next.data) return;

    if (next.type === 'solid') {
      const sr = r as any, nd = next.data as any;
      if (sr.setColor && nd?.color) sr.setColor(nd.color);
      if (sr.setSize && nd) sr.setSize(nd.width ?? 100, nd.height ?? 100);
    }
    if (next.type === 'shape') {
      const sr = r as any, nd = next.data as any;
      if (!nd) return;
      if (sr.updateData) sr.updateData(nd);
      else {
        if (sr.setFillColor && nd.fill?.color) sr.setFillColor(nd.fill.color);
        const w = 'width' in nd ? nd.width : ('radiusX' in nd ? nd.radiusX * 2 : (nd.radius ?? 50) * 2);
        const h = 'height' in nd ? nd.height : ('radiusY' in nd ? nd.radiusY * 2 : (nd.radius ?? 50) * 2);
        if (sr.setSize) sr.setSize(w, h);
      }
    }
    if (next.type === 'text') {
      const tr = r as any;
      if (tr.setText && next.data) tr.setText(next.data);
    }
    if (next.type === 'spline') {
      const sr = r as any;
      if (sr.updateData && next.data) sr.updateData(next.data);
    }
  }

  private _txChanged(a: Layer['transform'], b: Layer['transform']): boolean {
    return a.position.x !== b.position.x || a.position.y !== b.position.y ||
      a.scale.x !== b.scale.x || a.scale.y !== b.scale.y || a.rotation !== b.rotation ||
      a.anchorPoint.x !== b.anchorPoint.x || a.anchorPoint.y !== b.anchorPoint.y;
  }

  private _computeWorldTransform(
    local: Layer['transform'],
    parentId: string | null | undefined,
    layerMap: Map<string, Layer>,
  ): Layer['transform'] {
    if (!parentId) return local;

    const chain: Layer[] = [];
    let currentId: string | null | undefined = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const parent = layerMap.get(currentId);
      if (!parent) break;
      chain.push(parent);
      currentId = parent.parentId;
    }

    let worldPos = { x: local.position.x, y: local.position.y };
    let worldRot = local.rotation;
    let worldScale = { x: local.scale.x, y: local.scale.y };

    for (let i = chain.length - 1; i >= 0; i--) {
      const p = chain[i];
      const override = this._localOverrides.get(p.id);
      const px = override ? override.position.x : p.transform.position.x;
      const py = override ? override.position.y : p.transform.position.y;
      const pr = override ? override.rotation : p.transform.rotation;
      const psx = (override ? override.scale.x : p.transform.scale.x) / 100;
      const psy = (override ? override.scale.y : p.transform.scale.y) / 100;
      const prRad = THREE.MathUtils.degToRad(pr);

      const cos = Math.cos(prRad);
      const sin = Math.sin(prRad);
      const sx = worldPos.x * psx;
      const sy = worldPos.y * psy;
      worldPos = {
        x: px + sx * cos - sy * sin,
        y: py + sx * sin + sy * cos,
      };
      worldRot += pr;
      worldScale = {
        x: worldScale.x * psx,
        y: worldScale.y * psy,
      };
    }

    return {
      position: worldPos,
      scale: { x: worldScale.x * 100, y: worldScale.y * 100 },
      rotation: worldRot,
      anchorPoint: local.anchorPoint,
    };
  }

  private _updateZOrder(layers: Layer[]): void {
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    sorted.forEach((l, i) => {
      const r = this.renderers.get(l.id);
      if (!r) return;

      if (l.is3D) {
        r.mesh.renderOrder = 0;
        r.group.position.z = 0;
        r.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.Material;
            mat.depthTest = true;
            mat.depthWrite = !(mat.transparent && mat.opacity < 1);
            mat.needsUpdate = true;
          }
        });
      } else {
        r.mesh.renderOrder = sorted.length - 1 - i;
        r.group.position.z = -(i * 0.001);
        const mat = r.mesh.material as THREE.Material;
        if (mat && mat.depthTest !== false) {
          mat.depthTest = false;
          mat.depthWrite = false;
          mat.needsUpdate = true;
        }
      }
    });
  }

  /**
   * Apply masks to a single layer's canvas/texture.
   * Shared helper for both sync-time and per-frame mask application.
   */
  private _applyMasksToLayer(layerId: string): void {
    const store = useMaskStore.getState();
    const masks = store.getMasksForLayer(layerId);
    if (masks.length === 0) return;

    const r = this.renderers.get(layerId);
    if (!r) return;

    // Support both canvas-based renderers (_canvas/_ctx) and video renderers (_blitCanvas/_blitCtx)
    const canvas: HTMLCanvasElement | undefined = (r as any)._canvas ?? (r as any)._blitCanvas;
    const ctx: CanvasRenderingContext2D | undefined = (r as any)._ctx ?? (r as any)._blitCtx;
    if (!canvas || !ctx) return;

    const gw: number = (r as any).geometryWidth?.() ?? 0;
    const gh: number = (r as any).geometryHeight?.() ?? 0;
    if (gw <= 0 || gh <= 0) return;

    try {
      const DPI = 2;
      MaskCompositor.applyMasks(canvas, ctx, masks, gw, gh, DPI);
      const tex = (r as any)._tex ?? (r as any).texture;
      if (tex) tex.needsUpdate = true;
    } catch (err) {
      console.warn(`[LayerSync] Mask application failed for layer ${layerId}:`, err);
    }
  }

  private _applyMasks(layers: Layer[]): void {
    for (const layer of layers) {
      // Video layers are handled per-frame after pumpVideoFrame in Renderer.ts
      // — skip them here to avoid wasted work (pump overwrites the canvas).
      if (layer.type === 'video') continue;
      this._applyMasksToLayer(layer.id);
    }
  }

  /**
   * Apply masks to a specific layer AFTER video frame pump.
   * Must be called every frame for video layers since pumpVideoFrame
   * overwrites the blit canvas each tick.
   */
  applyMasksForLayer(layerId: string): void {
    this._applyMasksToLayer(layerId);
  }
}