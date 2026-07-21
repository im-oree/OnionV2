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
  /** Nested folder id (from Project.folders). null/undefined = root. */
  folderId?: string | null;
}

/**
 * Nested folder in the project browser tree.
 * `parentId=null` → root folder.
 */
export interface ProjectFolder {
  id: string;
  name: string;
  parentId: string | null;
  expanded?: boolean;
  color?: string;
  createdAt: number;
}

export interface Project {
  id:string; name:string; version:string;
  created:number; modified:number;
  compositions:Composition[];
  assets:ProjectAsset[];
  /** Nested folder tree. Precomps and assets can be assigned to folders. */
  folders?: ProjectFolder[];
  settings:ProjectSettings;
}
