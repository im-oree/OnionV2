import { create } from 'zustand';

const MAX_HISTORY=100;

export interface HistoryEntry{
  id:string; name:string; timestamp:number;
  previousSnapshot:string; newSnapshot:string;
}

export interface HistoryState{
  past:HistoryEntry[]; future:HistoryEntry[]; isApplying:boolean;
  pushEntry:(e:HistoryEntry)=>void;
  undo:()=>HistoryEntry|null;
  redo:()=>HistoryEntry|null;
  clear:()=>void;
  canUndo:()=>boolean;
  canRedo:()=>boolean;
}

export const useHistoryStore = create<HistoryState>((set,get)=>({
  past:[], future:[], isApplying:false,
  pushEntry:(entry)=>set(s=>({past:[...s.past.slice(-(MAX_HISTORY-1)),entry],future:[]})),
  undo:()=>{const s=get();if(!s.past.length)return null;const e=s.past[s.past.length-1];set({past:s.past.slice(0,-1),future:[...s.future,e],isApplying:true});return e},
  redo:()=>{const s=get();if(!s.future.length)return null;const e=s.future[s.future.length-1];set({future:s.future.slice(0,-1),past:[...s.past,e],isApplying:true});return e},
  clear:()=>set({past:[],future:[]}),
  canUndo:()=>get().past.length>0,
  canRedo:()=>get().future.length>0,
}));
