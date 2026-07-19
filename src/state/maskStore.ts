import { create } from 'zustand';
import type { PathCommand } from '../types/layer';
import { computePathBounds } from '../types/layer';

export type MaskMode = 'add'|'subtract'|'intersect'|'difference';
export type MaskShapeType = 'rectangle'|'ellipse'|'path';

export interface VectorMask {
  id: string; name: string; layerId: string;
  shapeType: MaskShapeType; commands: PathCommand[];
  bounds: { minX:number; minY:number; maxX:number; maxY:number };
  mode: MaskMode; inverted: boolean; opacity: number;
  feather: number; expansion: number;
  enabled: boolean; locked: boolean; color: string; collapsed: boolean;
}

const MASK_COLORS = ['#4A90E2','#E25B4A','#4AE28A','#E2C84A','#B44AE2','#4AE2D8'];
let _ci = 0;
function genId() { return `mask_${Date.now()}_${Math.random().toString(36).slice(2,5)}`; }

function makeMask(layerId: string, shapeType: MaskShapeType, commands: PathCommand[], name: string): VectorMask {
  return {
    id: genId(), name, layerId, shapeType, commands,
    bounds: computePathBounds(commands),
    mode: 'add', inverted: false, opacity: 100, feather: 0, expansion: 0,
    enabled: true, locked: false, color: MASK_COLORS[(_ci++)%MASK_COLORS.length], collapsed: false,
  };
}

function rectCmds(w: number, h: number): PathCommand[] {
  const hw=w/2,hh=h/2;
  return [
    {type:'M',points:[-hw,-hh]},{type:'L',points:[hw,-hh]},
    {type:'L',points:[hw,hh]},{type:'L',points:[-hw,hh]},{type:'Z',points:[]},
  ];
}
function ellipseCmds(rx: number, ry: number): PathCommand[] {
  const k=0.5522847498;
  return [
    {type:'M',points:[-rx,0]},{type:'C',points:[-rx,-ry*k,-rx*k,-ry,0,-ry]},
    {type:'C',points:[rx*k,-ry,rx,-ry*k,rx,0]},{type:'C',points:[rx,ry*k,rx*k,ry,0,ry]},
    {type:'C',points:[-rx*k,ry,-rx,ry*k,-rx,0]},{type:'Z',points:[]},
  ];
}

interface MaskStore {
  masksByLayer: Record<string, VectorMask[]>;
  selectedMaskId: string | null;
  addRectMask: (layerId: string, w?: number, h?: number) => VectorMask;
  addEllipseMask: (layerId: string, rx?: number, ry?: number) => VectorMask;
  addPathMask: (layerId: string, commands: PathCommand[]) => VectorMask;
  removeMask: (layerId: string, maskId: string) => void;
  updateMask: (layerId: string, maskId: string, patch: Partial<VectorMask>) => void;
  updateMaskCommands: (layerId: string, maskId: string, commands: PathCommand[]) => void;
  reorderMask: (layerId: string, maskId: string, newIndex: number) => void;
  selectMask: (maskId: string | null) => void;
  duplicateMask: (layerId: string, maskId: string) => void;
  getMasksForLayer: (layerId: string) => VectorMask[];
}

export const useMaskStore = create<MaskStore>((set, get) => ({
  masksByLayer: {}, selectedMaskId: null,

  addRectMask: (layerId, w=200, h=150) => {
    const cnt = (get().masksByLayer[layerId]?.length??0)+1;
    const mask = makeMask(layerId,'rectangle',rectCmds(w,h),`Rect Mask ${cnt}`);
    set(s=>({masksByLayer:{...s.masksByLayer,[layerId]:[...(s.masksByLayer[layerId]??[]),mask]},selectedMaskId:mask.id}));
    return mask;
  },
  addEllipseMask: (layerId, rx=100, ry=75) => {
    const cnt = (get().masksByLayer[layerId]?.length??0)+1;
    const mask = makeMask(layerId,'ellipse',ellipseCmds(rx,ry),`Ellipse Mask ${cnt}`);
    set(s=>({masksByLayer:{...s.masksByLayer,[layerId]:[...(s.masksByLayer[layerId]??[]),mask]},selectedMaskId:mask.id}));
    return mask;
  },
  addPathMask: (layerId, commands) => {
    const cnt = (get().masksByLayer[layerId]?.length??0)+1;
    const mask = makeMask(layerId,'path',commands,`Path Mask ${cnt}`);
    set(s=>({masksByLayer:{...s.masksByLayer,[layerId]:[...(s.masksByLayer[layerId]??[]),mask]},selectedMaskId:mask.id}));
    return mask;
  },
  removeMask: (layerId, maskId) => set(s=>({
    masksByLayer:{...s.masksByLayer,[layerId]:(s.masksByLayer[layerId]??[]).filter(m=>m.id!==maskId)},
    selectedMaskId: s.selectedMaskId===maskId ? null : s.selectedMaskId,
  })),
  updateMask: (layerId, maskId, patch) => set(s=>({
    masksByLayer:{...s.masksByLayer,[layerId]:(s.masksByLayer[layerId]??[]).map(m=>m.id===maskId?{...m,...patch}:m)},
  })),
  updateMaskCommands: (layerId, maskId, commands) => set(s=>({
    masksByLayer:{...s.masksByLayer,[layerId]:(s.masksByLayer[layerId]??[]).map(m=>m.id===maskId?{...m,commands,bounds:computePathBounds(commands)}:m)},
  })),
  reorderMask: (layerId, maskId, newIndex) => set(s=>{
    const masks=[...(s.masksByLayer[layerId]??[])];
    const idx=masks.findIndex(m=>m.id===maskId); if(idx<0)return s;
    const [moved]=masks.splice(idx,1);
    masks.splice(Math.max(0,Math.min(newIndex,masks.length)),0,moved);
    return {masksByLayer:{...s.masksByLayer,[layerId]:masks}};
  }),
  selectMask: (maskId) => set({selectedMaskId:maskId}),
  duplicateMask: (layerId, maskId) => {
    const mask=(get().masksByLayer[layerId]??[]).find(m=>m.id===maskId); if(!mask)return;
    const clone={...mask,id:genId(),name:mask.name+' Copy',commands:mask.commands.map(c=>({...c,points:[...c.points]}))};
    set(s=>({masksByLayer:{...s.masksByLayer,[layerId]:[...(s.masksByLayer[layerId]??[]),clone]},selectedMaskId:clone.id}));
  },
  getMasksForLayer: (layerId) => get().masksByLayer[layerId]??[],
}));