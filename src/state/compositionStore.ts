import { create } from 'zustand';
import type { Composition } from '../types/composition';
import type { Layer } from '../types/layer';
import { DEFAULT_COMPOSITION } from '../config/defaults';

function genId():string{return `comp_${Date.now()}_${Math.random().toString(36).slice(2,9)}`}

export interface CompositionState{
  compositions:Composition[]; activeCompositionId:string|null;
  addComposition:(overrides?:Partial<Composition>)=>Composition;
  removeComposition:(id:string)=>void;
  setActiveComposition:(id:string)=>void;
  updateComposition:(id:string,updates:Partial<Composition>)=>void;
  addLayer:(compId:string,layer:Layer)=>void;
  removeLayer:(compId:string,layerId:string)=>void;
  updateLayer:(compId:string,layerId:string,updates:Partial<Layer>)=>void;
  reorderLayers:(compId:string,from:number,to:number)=>void;
  setCurrentTime:(compId:string,time:number)=>void;
  getActiveComposition:()=>Composition|null;
}

export const useCompositionStore = create<CompositionState>((set,get)=>({
  compositions:[], activeCompositionId:null,
  addComposition:(overrides)=>{
    const c:Composition={...DEFAULT_COMPOSITION,id:genId(),name:`Comp ${get().compositions.length+1}`,...overrides};
    set(s=>({compositions:[...s.compositions,c],activeCompositionId:s.activeCompositionId??c.id}));
    return c;
  },
  removeComposition:(id)=>set(s=>({compositions:s.compositions.filter(c=>c.id!==id),activeCompositionId:s.activeCompositionId===id?s.compositions.find(c=>c.id!==id)?.id??null:s.activeCompositionId})),
  setActiveComposition:(id)=>set({activeCompositionId:id}),
  updateComposition:(id,updates)=>set(s=>({compositions:s.compositions.map(c=>c.id===id?{...c,...updates}:c)})),
  addLayer:(compId,layer)=>set(s=>({compositions:s.compositions.map(c=>c.id===compId?{...c,layers:[...c.layers,layer]}:c)})),
  removeLayer:(compId,layerId)=>set(s=>({compositions:s.compositions.map(c=>c.id===compId?{...c,layers:c.layers.filter(l=>l.id!==layerId)}:c)})),
  updateLayer:(compId,layerId,updates)=>set(s=>({compositions:s.compositions.map(c=>c.id===compId?{...c,layers:c.layers.map(l=>l.id===layerId?{...l,...updates}:l)}:c)})),
  reorderLayers:(compId,from,to)=>set(s=>({compositions:s.compositions.map(c=>{if(c.id!==compId)return c;const layers=[...c.layers];const[m]=layers.splice(from,1);m&&layers.splice(to,0,m);return{...c,layers}})})),
  setCurrentTime:(compId,time)=>set(s=>({compositions:s.compositions.map(c=>c.id===compId?{...c,currentTime:time}:c)})),
  getActiveComposition:()=>{const s=get();return s.activeCompositionId?s.compositions.find(c=>c.id===s.activeCompositionId)??null:null},
}));
