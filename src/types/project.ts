import type { Composition } from './composition';

export interface ProjectSettings {
  adaptiveResolution:boolean; ramPreview:boolean;
  targetFps:number; gridSnap:boolean; snapToGuides:boolean;
  autoSaveInterval?:number; defaultWidth?:number; defaultHeight?:number; defaultFps?:number;
  notes?:string;
}

export interface ProjectAsset {
  id:string; name:string;
  type:'image'|'video'|'audio'|'font'|'other';
  path:string; size:number; originalName:string;
  mimeType:string; importedAt:number;
  naturalWidth?:number; naturalHeight?:number; duration?:number;
}

export interface Project {
  id:string; name:string; version:string;
  created:number; modified:number;
  compositions:Composition[];
  assets:ProjectAsset[];
  settings:ProjectSettings;
}
