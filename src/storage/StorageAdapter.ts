/**
 * StorageAdapter — abstract interface that all storage backends implement.
 * Provides a unified API for saving/loading projects and assets regardless of backend.
 */
export type AdapterType = 'filesystem' | 'indexeddb' | 'download';

export interface StorageCapabilities {
  directFileAccess: boolean;
  persistentWorkspace: boolean;
  largeFiles: boolean;
  backgroundWrites: boolean;
  maxFileSize: number; // bytes, 0 = unlimited
}

export interface ProjectHandle {
  id: string;
  name: string;
  adapterType: AdapterType;
  /** Opaque backend-specific data */
  internal: any;
}

export interface WorkspaceHandle {
  id: string;
  name: string;
  internal: any;
}

export interface AssetRef {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Relative path within project */
  relativePath: string;
  /** Original in-memory asset ID — used to restore layers' assetId references */
  originalId?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  created: string; // ISO timestamp
  modified: string;
  version: string;
  thumbnail?: string; // data URL
}

export interface SaveOptions {
  createIfMissing?: boolean;
  backupPrevious?: boolean;
}

export interface SerializedProject {
  version: string;
  appVersion: string;
  created: string;
  modified: string;
  name: string;
  compositions: any[];
  activeCompositionId: string | null;
  layers: Record<string, any[]>;
  keyframes: Record<string, Record<string, any[]>>;
  effects: Record<string, any[]>;
  masks: Record<string, any[]>;
  assets: AssetRef[];
  ui: {
    workspaceLayout: any;
    viewportState: { zoom: number; panX: number; panY: number };
    timelineState: { zoom: number; scrollX: number };
  };
  preferences: Record<string, any>;
}

export interface StorageAdapter {
  readonly type: AdapterType;
  readonly capabilities: StorageCapabilities;
  readonly name: string;

  // Project files
  saveProject(project: SerializedProject, handle: ProjectHandle, options?: SaveOptions): Promise<void>;
  loadProject(handle: ProjectHandle): Promise<SerializedProject>;
  deleteProject(handle: ProjectHandle): Promise<void>;

  // Assets
  saveAsset(blob: Blob, filename: string, projectHandle: ProjectHandle): Promise<AssetRef>;
  loadAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<Blob>;
  deleteAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<void>;
  listAssets(projectHandle: ProjectHandle): Promise<AssetRef[]>;

  // Workspace
  pickWorkspace(): Promise<WorkspaceHandle>;
  getWorkspace(): Promise<WorkspaceHandle | null>;
  listProjects(): Promise<ProjectHandle[]>;
  createProject(name: string): Promise<ProjectHandle>;

  // Metadata
  getProjectMetadata(handle: ProjectHandle): Promise<ProjectMetadata>;
  adapterAvailable(): Promise<boolean>;

  // Internal workspace-scoped files (thumbnails, presets, etc.)
  // Optional — adapters may implement or omit; consumers should feature-detect.
  saveInternalFile?(relativePath: string, blob: Blob): Promise<void>;
  loadInternalFile?(relativePath: string): Promise<Blob | null>;
  deleteInternalFile?(relativePath: string): Promise<void>;
  deleteInternalDirectory?(relativePath: string): Promise<void>;
}
