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

/**
 * Asset categories map to organized subfolders under Media/ in the project.
 */
export type AssetCategory = 'images' | 'audio' | 'video' | 'fonts' | '3d-models';

export interface AssetRef {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Relative path within project — e.g. Media/images/photo.png */
  relativePath: string;
  /** Original in-memory asset ID — used to restore layers' assetId references */
  originalId?: string;
  /** Category determines the subfolder — e.g. 'images', 'audio', 'video', 'fonts', '3d-models' */
  category?: AssetCategory;
  /** SHA-256 hex hash of the file content, used for deduplication */
  hash?: string;
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
  saveAsset(blob: Blob, filename: string, projectHandle: ProjectHandle, category?: AssetCategory): Promise<AssetRef>;
  loadAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<Blob>;
  deleteAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<void>;
  listAssets(projectHandle: ProjectHandle): Promise<AssetRef[]>;

  // Workspace
  pickWorkspace(): Promise<WorkspaceHandle>;
  getWorkspace(): Promise<WorkspaceHandle | null>;
  listProjects(): Promise<ProjectHandle[]>;
  createProject(name: string): Promise<ProjectHandle>;

  // Create the organized Media/ folder structure for a new project
  initProjectFolders?(projectHandle: ProjectHandle): Promise<void>;

  // Metadata
  getProjectMetadata(handle: ProjectHandle): Promise<ProjectMetadata>;
  adapterAvailable(): Promise<boolean>;

  // Check if an asset with the given hash already exists in the project
  findAssetByHash?(hash: string, projectHandle: ProjectHandle): Promise<AssetRef | null>;

  // Internal workspace-scoped files (thumbnails, presets, etc.)
  // Optional — adapters may implement or omit; consumers should feature-detect.
  saveInternalFile?(relativePath: string, blob: Blob): Promise<void>;
  loadInternalFile?(relativePath: string): Promise<Blob | null>;
  deleteInternalFile?(relativePath: string): Promise<void>;
  deleteInternalDirectory?(relativePath: string): Promise<void>;
}
