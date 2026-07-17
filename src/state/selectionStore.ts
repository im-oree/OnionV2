import { create } from 'zustand';

export type SelectableType = 'layer'|'keyframe'|'effect'|'mask'|'point';

export interface SelectionItem{
  type:SelectableType; id:string; compositionId:string; parentId?:string;
}

export interface SelectionState{
  selected:SelectionItem[]; lastSelected:SelectionItem|null;
  select:(item:SelectionItem,addToSelection?:boolean)=>void;
  deselect:(id:string)=>void;
  toggleSelection:(item:SelectionItem)=>void;
  selectAll:(compositionId:string)=>void;
  deselectAll:()=>void;
  clearSelection:()=>void;
  isSelected:(id:string)=>boolean;
  getSelectedLayers:()=>SelectionItem[];
  getSelectedKeyframes:()=>SelectionItem[];
}

export const useSelectionStore = create<SelectionState>((set,get)=>({
  selected:[], lastSelected:null,
  select:(item,addToSelection=false)=>set(s=>({selected:addToSelection?[...s.selected,item]:[item],lastSelected:item})),
  deselect:(id)=>set(s=>({selected:s.selected.filter(x=>x.id!==id),lastSelected:s.lastSelected?.id===id?s.selected.find(x=>x.id!==id)??null:s.lastSelected})),
  toggleSelection:(item)=>{const s=get();s.isSelected(item.id)?s.deselect(item.id):s.select(item,true)},
  selectAll:(_compositionId)=>set({selected:[]}),
  deselectAll:()=>set({selected:[],lastSelected:null}),
  clearSelection:()=>set({selected:[],lastSelected:null}),
  isSelected:(id)=>!!get().selected.some(s=>s.id===id),
  getSelectedLayers:()=>get().selected.filter(s=>s.type==='layer'),
  getSelectedKeyframes:()=>get().selected.filter(s=>s.type==='keyframe'),
}));
