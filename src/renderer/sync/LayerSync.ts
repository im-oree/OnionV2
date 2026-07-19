import type { Layer } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import { LayerFactory } from '../layers/LayerFactory';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import type { RuntimeOverrides } from '../../animation/PropertyBinder';
import { useCompositionStore } from '../../state/compositionStore';

export class LayerSync {
  private factory: LayerFactory;
  private renderers = new Map<string, BaseLayerRenderer>();
  private prevLayers: Layer[] = [];
  private _runtimeOverridesActive = false;

  constructor(sceneManager: SceneManager) { this.factory = new LayerFactory(sceneManager); }

  setRuntimeOverridesActive(active: boolean): void { this._runtimeOverridesActive = active; }

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
      if(!prev){this.renderers.set(layer.id,this.factory.create(layer));}
      else{this._updateRenderer(layer.id,prev,layer);}
    }
    this._updateZOrder(layers);
    this.prevLayers=layers;
  }

  private _getLayers(): Layer[] {
    const cs=useCompositionStore.getState();
    const comp=cs.activeCompositionId?cs.compositions.find(c=>c.id===cs.activeCompositionId):null;
    return comp?.layers??this.prevLayers;
  }

  applyRuntimeOverrides(overrides: RuntimeOverrides): void {
    const layers=this._getLayers();
    for(const [layerId,override] of overrides){
      const r=this.renderers.get(layerId); if(!r)continue;
      const layer=layers.find(l=>l.id===layerId); if(!layer)continue;
      r.updateTransform({
        position:override.position??layer.transform.position,
        scale:override.scale??layer.transform.scale,
        rotation:override.rotation??layer.transform.rotation,
        anchorPoint:override.anchorPoint??layer.transform.anchorPoint,
      });
      if(override.opacity!==undefined)r.updateOpacity(override.opacity/100);
    }
  }

  restoreFromOverrides(): void {
    const layers=this._getLayers();
    for(const layer of layers){
      const r=this.renderers.get(layer.id); if(!r)continue;
      r.updateTransform(layer.transform);
      r.updateOpacity(layer.opacity/100);
    }
  }

  updateFrameVisibility(currentFrame: number): void {
    const layers=this._getLayers();
    for(const layer of layers){
      const r=this.renderers.get(layer.id); if(!r)continue;
      r.setVisible(layer.visible&&currentFrame>=layer.startFrame&&currentFrame<=layer.endFrame);
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
      if(this._txChanged(prev.transform,next.transform))r.updateTransform(next.transform);
      if(prev.opacity!==next.opacity)r.updateOpacity(next.opacity/100);
    }
    if(prev.visible!==next.visible)r.setVisible(next.visible);
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
  }

  private _txChanged(a: Layer['transform'], b: Layer['transform']): boolean {
    return a.position.x!==b.position.x||a.position.y!==b.position.y||
      a.scale.x!==b.scale.x||a.scale.y!==b.scale.y||a.rotation!==b.rotation||
      a.anchorPoint.x!==b.anchorPoint.x||a.anchorPoint.y!==b.anchorPoint.y;
  }

  private _updateZOrder(layers: Layer[]): void {
    layers.forEach((l,i)=>{ const r=this.renderers.get(l.id); if(r)r.group.position.z=-(i*0.001); });
  }
}