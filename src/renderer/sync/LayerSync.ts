import * as THREE from 'three';
import type { Layer } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import { LayerFactory } from '../layers/LayerFactory';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import type { RuntimeOverrides } from '../../animation/PropertyBinder';
import { useCompositionStore } from '../../state/compositionStore';
import { applyBlendModeToMaterial } from '../blending/ApplyBlendMode';

export class LayerSync {
  private factory: LayerFactory;
  private renderers = new Map<string, BaseLayerRenderer>();
  private prevLayers: Layer[] = [];
  private _runtimeOverridesActive = false;
  /** Stores the last-applied LOCAL transform override for each layer (used for child computation). */
  private _localOverrides = new Map<string, Layer['transform']>();

  constructor(sceneManager: SceneManager) { this.factory = new LayerFactory(sceneManager); }

  setRuntimeOverridesActive(active: boolean): void { this._runtimeOverridesActive = active; }
  get isRuntimeOverridesActive(): boolean { return this._runtimeOverridesActive; }

  sync(layers: Layer[]): void {
    const prevMap = new Map<string,Layer>();
    for(const l of this.prevLayers) prevMap.set(l.id,l);
    const nextMap = new Map<string,Layer>();
    for(const l of layers) nextMap.set(l.id,l);

    for(const [id] of prevMap){
      if(!nextMap.has(id)){
        const r=this.renderers.get(id);
        if(r){this.factory.remove(r);this.renderers.delete(id);}
      }
    }
    for(const layer of layers){
      const prev=prevMap.get(layer.id);
      if(!prev){
        const r = this.factory.create(layer);
        this.renderers.set(layer.id, r);
        // Apply initial blend mode
        const mat = r.mesh.material as THREE.Material;
        if (mat && layer.blendMode && layer.blendMode !== 'normal') {
          applyBlendModeToMaterial(mat, layer.blendMode);
        }
      }
      else{this._updateRenderer(layer.id,prev,layer);}
    }
    this._updateZOrder(layers);

    // Apply masks to canvas-based renderers
    this._applyMasks(layers);

    // Second pass: recompute world transforms for ALL parented layers.
    // This ensures children update when a parent moves, even if the child's
    // own local transform hasn't changed.
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);
    for (const layer of layers) {
      if (!layer.parentId) continue;
      const r = this.renderers.get(layer.id);
      if (!r) continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
    }

    this.prevLayers=layers;
  }

  private _getLayers(): Layer[] {
    const cs=useCompositionStore.getState();
    const comp=cs.activeCompositionId?cs.compositions.find(c=>c.id===cs.activeCompositionId):null;
    return comp?.layers??this.prevLayers;
  }

  applyRuntimeOverrides(overrides: RuntimeOverrides): void {
    // Clear stale overrides from previous frame
    this._localOverrides.clear();

    const layers=this._getLayers();
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);

    // First pass: apply overrides to directly-animated layers
    for(const [layerId,override] of overrides){
      const r=this.renderers.get(layerId); if(!r)continue;
      const layer=layers.find(l=>l.id===layerId); if(!layer)continue;
      const localTransform = {
        position:override.position??layer.transform.position,
        scale:override.scale??layer.transform.scale,
        rotation:override.rotation??layer.transform.rotation,
        anchorPoint:override.anchorPoint??layer.transform.anchorPoint,
      };
      const worldTransform = this._computeWorldTransform(localTransform, layer.parentId, layerMap);
      this._localOverrides.set(layerId, localTransform);
      r.updateTransform(worldTransform);
      if(override.opacity!==undefined)r.updateOpacity(override.opacity/100);
    }

    // Second pass: recompute world transforms for ALL parented layers
    // This ensures children follow their parent's animated position
    for (const layer of layers) {
      if (!layer.parentId) continue;
      // Skip layers that were already updated in the first pass (they have overrides)
      if (overrides.has(layer.id)) continue;
      const r = this.renderers.get(layer.id);
      if (!r) continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
    }
  }

  restoreFromOverrides(): void {
    const layers=this._getLayers();
    const layerMap = new Map<string, Layer>();
    for (const l of layers) layerMap.set(l.id, l);
    for(const layer of layers){
      const r=this.renderers.get(layer.id); if(!r)continue;
      const worldTransform = this._computeWorldTransform(layer.transform, layer.parentId, layerMap);
      r.updateTransform(worldTransform);
      r.updateOpacity(layer.opacity/100);
    }
  }

  updateFrameVisibility(currentFrame: number): void {
    const layers=this._getLayers();
    // Check if ANY layer is soloed — if so, only soloed layers (that are
    // also visible and in frame range) should be shown.
    const hasSolo = layers.some(l => l.soloed);
    const wireframe = !!(window as any).__wireframeMode;
    for(const layer of layers){
      const r=this.renderers.get(layer.id); if(!r)continue;
      // Adjustment layers never render as a mesh — their effect output is
      // shown on a compositor quad managed by AdjustmentCompositor.
      if (layer.type === 'adjustment' || layer.type === 'camera' || layer.type === 'light' || layer.type === 'null') { r.setVisible(false); continue; }
      const inFrame = currentFrame >= layer.startFrame && currentFrame <= layer.endFrame;
      const visible = layer.visible && inFrame && (hasSolo ? !!layer.soloed : true);
      r.setVisible(visible);
      // Apply wireframe mode
      if (r.setWireframe) r.setWireframe(wireframe);
    }
  }

  clear(): void {
    for(const r of this.renderers.values())r.dispose();
    this.renderers.clear(); this.prevLayers=[]; this.factory.clearAll();
  }

  getRenderer(layerId: string): BaseLayerRenderer|undefined { return this.renderers.get(layerId); }
  getAllRenderers(): Map<string,BaseLayerRenderer> { return this.renderers; }

  private _updateRenderer(layerId: string, prev: Layer, next: Layer): void {
    const r=this.renderers.get(layerId); if(!r)return;

    if(!this._runtimeOverridesActive){
      if(this._txChanged(prev.transform,next.transform)||prev.parentId!==next.parentId){
        const layerMap = new Map<string, Layer>();
        for (const l of this.prevLayers) layerMap.set(l.id, l);
        const worldTransform = this._computeWorldTransform(next.transform, next.parentId, layerMap);
        r.updateTransform(worldTransform);
      }
      if(prev.opacity!==next.opacity)r.updateOpacity(next.opacity/100);
    }
    if(prev.visible!==next.visible)r.setVisible(next.visible);

    // Blend mode changed → update material blending
    if (prev.blendMode !== next.blendMode) {
      const mat = r.mesh.material as THREE.Material;
      if (mat) applyBlendModeToMaterial(mat, next.blendMode);
    }

    if(prev.data===next.data)return;

    if(next.type==='solid'){
      const sr=r as any, nd=next.data as any;
      if(sr.setColor&&nd?.color)sr.setColor(nd.color);
      if(sr.setSize&&nd)sr.setSize(nd.width??100,nd.height??100);
    }
    if(next.type==='shape'){
      const sr=r as any, nd=next.data as any;
      if(!nd)return;
      if(sr.updateData)sr.updateData(nd);
      else {
        if(sr.setFillColor&&nd.fill?.color)sr.setFillColor(nd.fill.color);
        const w='width'in nd?nd.width:('radiusX'in nd?nd.radiusX*2:(nd.radius??50)*2);
        const h='height'in nd?nd.height:('radiusY'in nd?nd.radiusY*2:(nd.radius??50)*2);
        if(sr.setSize)sr.setSize(w,h);
      }
    }
    if(next.type==='text'){
      const tr=r as any;
      if(tr.setText&&next.data)tr.setText(next.data);
    }
    if(next.type==='spline'){
      const sr=r as any;
      if(sr.updateData&&next.data)sr.updateData(next.data);
    }
  }

  private _txChanged(a: Layer['transform'], b: Layer['transform']): boolean {
    return a.position.x!==b.position.x||a.position.y!==b.position.y||
      a.scale.x!==b.scale.x||a.scale.y!==b.scale.y||a.rotation!==b.rotation||
      a.anchorPoint.x!==b.anchorPoint.x||a.anchorPoint.y!==b.anchorPoint.y;
  }

  /**
   * Compute the world transform for a layer by composing with its parent's transform.
   * Child position is rotated/scaled by parent, child rotation adds to parent rotation,
   * child scale multiplies with parent scale. Uses iterative approach to handle
   * nested hierarchies (grandparent → parent → child).
   */
  private _computeWorldTransform(
    local: Layer['transform'],
    parentId: string | null | undefined,
    layerMap: Map<string, Layer>,
  ): Layer['transform'] {
    if (!parentId) return local;

    // Build ancestor chain (child → parent → grandparent → ...)
    const chain: Layer[] = [];
    let currentId: string | null | undefined = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) break; // prevent infinite loops
      visited.add(currentId);
      const parent = layerMap.get(currentId);
      if (!parent) break;
      chain.push(parent);
      currentId = parent.parentId;
    }

    // Apply transforms from root to immediate parent (innermost first)
    let worldPos = { x: local.position.x, y: local.position.y };
    let worldRot = local.rotation;
    let worldScale = { x: local.scale.x, y: local.scale.y };

    for (let i = chain.length - 1; i >= 0; i--) {
      const p = chain[i];
      // Use animated override if parent was animated, else base transform
      const override = this._localOverrides.get(p.id);
      const px = override ? override.position.x : p.transform.position.x;
      const py = override ? override.position.y : p.transform.position.y;
      const pr = override ? override.rotation : p.transform.rotation;
      const psx = (override ? override.scale.x : p.transform.scale.x) / 100;
      const psy = (override ? override.scale.y : p.transform.scale.y) / 100;
      const prRad = THREE.MathUtils.degToRad(pr);

      // Rotate child position by parent rotation, then scale, then add parent position
      const cos = Math.cos(prRad);
      const sin = Math.sin(prRad);
      const sx = worldPos.x * psx;
      const sy = worldPos.y * psy;
      worldPos = {
        x: px + sx * cos - sy * sin,
        y: py + sx * sin + sy * cos,
      };

      // Add parent rotation
      worldRot += pr;

      // Multiply parent scale (as percentage)
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
    // Sort by zIndex descending: higher zIndex = rendered on top
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    sorted.forEach((l, i) => {
      const r = this.renderers.get(l.id);
      if (!r) return;

      if (l.is3D) {
        // 3D layers: use proper depth testing so objects occlude each other
        // based on their Z position. Three.js handles depth ordering natively.
        r.mesh.renderOrder = 0;
        const mat = r.mesh.material as THREE.Material;
        if (mat) {
          mat.depthTest = true;
          mat.depthWrite = true;
          mat.needsUpdate = true;
        }
      } else {
        // 2D layers: no depth testing, use renderOrder for stacking
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

  private async _applyMasks(layers: Layer[]): Promise<void> {
    // Dynamic imports to avoid circular deps at module load
    const [{ useMaskStore }, { MaskCompositor }] = await Promise.all([
      import('../../state/maskStore'),
      import('../compositing/MaskCompositor'),
    ]);
    const store = useMaskStore.getState();

    for (const layer of layers) {
      const masks = store.getMasksForLayer(layer.id);
      if (masks.length === 0) continue;

      const r = this.renderers.get(layer.id);
      if (!r) continue;

      // Only works for canvas-based renderers (Shape, Solid, Text)
      const canvas: HTMLCanvasElement | undefined = (r as any)._canvas;
      const ctx: CanvasRenderingContext2D | undefined = (r as any)._ctx;
      if (!canvas || !ctx) continue;

      const gw: number = (r as any).geometryWidth?.() ?? 0;
      const gh: number = (r as any).geometryHeight?.() ?? 0;
      if (gw <= 0 || gh <= 0) continue;

      const DPI = 2;
      MaskCompositor.applyMasks(canvas, ctx, masks, gw, gh, DPI);

      // Force texture re-upload
      const tex = (r as any)._tex;
      if (tex) tex.needsUpdate = true;
    }
  }
}