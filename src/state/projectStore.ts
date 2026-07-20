import { create } from 'zustand';
import type { Project, ProjectAsset } from '../types/project';
import { DEFAULT_PROJECT } from '../config/defaults';

function genId():string{return `proj_${Date.now()}_${Math.random().toString(36).slice(2,9)}`}

export interface ProjectState{
  project:Project; dirty:boolean; fileHandle:FileSystemFileHandle|null;
  setProject:(p:Project)=>void; setDirty:(d:boolean)=>void;
  setFileHandle:(h:FileSystemFileHandle|null)=>void;
  addAsset:(a:ProjectAsset)=>void; removeAsset:(id:string)=>void; renameAsset:(id:string,name:string)=>void;
  updateSettings:(s:Partial<Project['settings']>)=>void;
  newProject:()=>void;
}

export const useProjectStore = create<ProjectState>((set)=>({
  project:{...DEFAULT_PROJECT, id:genId()},
  dirty:false, fileHandle:null,
  setProject:(project)=>set({project,dirty:true}),
  setDirty:(dirty)=>set({dirty}),
  setFileHandle:(handle)=>set({fileHandle:handle}),
  addAsset:(asset)=>set((s)=>({project:{...s.project,assets:[...s.project.assets,asset],modified:Date.now()},dirty:true})),
  removeAsset:(assetId)=>set((s)=>({project:{...s.project,assets:s.project.assets.filter(a=>a.id!==assetId),modified:Date.now()},dirty:true})),
  renameAsset:(assetId,newName)=>set((s)=>({project:{...s.project,assets:s.project.assets.map(a=>a.id===assetId?{...a,name:newName}:a),modified:Date.now()},dirty:true})),
  updateSettings:(settings)=>set((s)=>({project:{...s.project,settings:{...s.project.settings,...settings},modified:Date.now()},dirty:true})),
  newProject:()=>set({project:{...DEFAULT_PROJECT,id:genId()},dirty:false,fileHandle:null}),
}));
