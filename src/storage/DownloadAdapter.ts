/**
 * DownloadAdapter — Last-resort storage via download/upload.
 * For browsers without File System API or IndexedDB support (Safari, legacy).
 * Projects are downloaded as .onion.json files and re-uploaded to load.
 */
import type { StorageAdapter, StorageCapabilities, ProjectHandle, WorkspaceHandle, AssetRef, ProjectMetadata, SerializedProject, SaveOptions } from './StorageAdapter';

export class DownloadAdapter implements StorageAdapter {
  readonly type = 'download' as const;
  readonly name = 'Download/Upload';
  readonly capabilities: StorageCapabilities = {
    directFileAccess: false,
    persistentWorkspace: false,
    largeFiles: false,
    backgroundWrites: false,
    maxFileSize: 100 * 1024 * 1024, // 100MB
  };

  private _projectCache: Map<string, SerializedProject> = new Map();

  async adapterAvailable(): Promise<boolean> {
    return typeof Blob !== 'undefined' && typeof URL !== 'undefined';
  }

  async pickWorkspace(): Promise<WorkspaceHandle> {
    return { id: 'download_workspace', name: 'Download Workspace', internal: null };
  }

  async getWorkspace(): Promise<WorkspaceHandle | null> {
    return { id: 'download_workspace', name: 'Download Workspace', internal: null };
  }

  async listProjects(): Promise<ProjectHandle[]> {
    // No persistent project listing for download adapter
    return [];
  }

  async createProject(name: string): Promise<ProjectHandle> {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return {
      id,
      name,
      adapterType: 'download',
      internal: id,
    };
  }

  async saveProject(project: SerializedProject, handle: ProjectHandle, _options?: SaveOptions): Promise<void> {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${handle.name}.onion.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._projectCache.set(handle.id, project);
  }

  async loadProject(handle: ProjectHandle): Promise<SerializedProject> {
    // Check cache first
    const cached = this._projectCache.get(handle.id);
    if (cached) return cached;

    // Otherwise prompt user to upload a file
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.onion,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return reject(new Error('No file selected'));
        const text = await file.text();
        try {
          const project = JSON.parse(text) as SerializedProject;
          this._projectCache.set(handle.id, project);
          resolve(project);
        } catch (e) {
          reject(new Error('Invalid project file'));
        }
      };
      input.click();
    });
  }

  async deleteProject(handle: ProjectHandle): Promise<void> {
    this._projectCache.delete(handle.id);
  }

  async saveAsset(blob: Blob, filename: string, _projectHandle: ProjectHandle): Promise<AssetRef> {
    // For download adapter, assets are embedded in the project JSON via URL.createObjectURL
    // They won't persist across sessions — user must re-import
    return {
      id: `asset_${Date.now()}_${filename}`,
      filename,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size,
      relativePath: filename,
    };
  }

  async loadAsset(_ref: AssetRef, _projectHandle: ProjectHandle): Promise<Blob> {
    throw new Error('Assets not persisted in Download mode — re-import the asset');
  }

  async deleteAsset(_ref: AssetRef, _projectHandle: ProjectHandle): Promise<void> {
    // No-op for download adapter
  }

  async listAssets(_projectHandle: ProjectHandle): Promise<AssetRef[]> {
    return [];
  }

  async getProjectMetadata(handle: ProjectHandle): Promise<ProjectMetadata> {
    const cached = this._projectCache.get(handle.id);
    if (cached) {
      return {
        id: handle.id,
        name: cached.name,
        created: cached.created,
        modified: cached.modified,
        version: cached.version,
      };
    }
    return {
      id: handle.id,
      name: handle.name,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0',
    };
  }
}
