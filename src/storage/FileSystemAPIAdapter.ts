/**
 * FileSystemAPIAdapter — Primary storage using the File System Access API.
 * Works in Chromium-based browsers. Each project is a folder on the user's disk.
 */
import type { StorageAdapter, StorageCapabilities, ProjectHandle, WorkspaceHandle, AssetRef, ProjectMetadata, SerializedProject, SaveOptions } from './StorageAdapter';

export class FileSystemAPIAdapter implements StorageAdapter {
  readonly type = 'filesystem' as const;
  readonly name = 'File System API';
  readonly capabilities: StorageCapabilities = {
    directFileAccess: true,
    persistentWorkspace: true,
    largeFiles: true,
    backgroundWrites: true,
    maxFileSize: 0, // unlimited
  };

  private workspaceHandle: FileSystemDirectoryHandle | null = null;

  async adapterAvailable(): Promise<boolean> {
    return typeof (window as any).showDirectoryPicker === 'function';
  }

  async pickWorkspace(): Promise<WorkspaceHandle> {
    if (!await this.adapterAvailable()) throw new Error('File System API not available');
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    this.workspaceHandle = handle;
    return {
      id: handle.name + '_workspace',
      name: handle.name,
      internal: handle,
    };
  }

  async getWorkspace(): Promise<WorkspaceHandle | null> {
    if (this.workspaceHandle) {
      return {
        id: this.workspaceHandle.name + '_workspace',
        name: this.workspaceHandle.name,
        internal: this.workspaceHandle,
      };
    }
    return null;
  }

  async listProjects(): Promise<ProjectHandle[]> {
    if (!this.workspaceHandle) return [];
    const projects: ProjectHandle[] = [];
    for await (const [name, entry] of (this.workspaceHandle as any).entries()) {
      if (entry.kind === 'directory') {
        projects.push({
          id: name,
          name,
          adapterType: 'filesystem',
          internal: entry,
        });
      }
    }
    return projects;
  }

  async saveProject(project: SerializedProject, handle: ProjectHandle, _options?: SaveOptions): Promise<void> {
    const dirHandle = handle.internal as FileSystemDirectoryHandle;
    const fileHandle = await dirHandle.getFileHandle('project.onion', { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    const json = JSON.stringify(project, null, 2);
    await writable.write(json);
    await writable.close();
  }

  async loadProject(handle: ProjectHandle): Promise<SerializedProject> {
    const dirHandle = handle.internal as FileSystemDirectoryHandle;
    const fileHandle = await dirHandle.getFileHandle('project.onion');
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as SerializedProject;
  }

  async deleteProject(handle: ProjectHandle): Promise<void> {
    if (this.workspaceHandle) {
      await this.workspaceHandle.removeEntry(handle.name, { recursive: true });
    }
  }

  async saveAsset(blob: Blob, filename: string, projectHandle: ProjectHandle): Promise<AssetRef> {
    const dirHandle = projectHandle.internal as FileSystemDirectoryHandle;
    const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
    const fileHandle = await assetsDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(blob);
    await writable.close();
    return {
      id: `asset_${Date.now()}_${filename}`,
      filename,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size,
      relativePath: `assets/${filename}`,
    };
  }

  async loadAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<Blob> {
    const dirHandle = projectHandle.internal as FileSystemDirectoryHandle;
    const assetsDir = await dirHandle.getDirectoryHandle('assets');
    const fileHandle = await assetsDir.getFileHandle(ref.filename);
    const file = await fileHandle.getFile();
    return file;
  }

  async deleteAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<void> {
    const dirHandle = projectHandle.internal as FileSystemDirectoryHandle;
    try {
      const assetsDir = await dirHandle.getDirectoryHandle('assets');
      await assetsDir.removeEntry(ref.filename);
    } catch {
      // File may not exist — ignore
    }
  }

  async listAssets(projectHandle: ProjectHandle): Promise<AssetRef[]> {
    const dirHandle = projectHandle.internal as FileSystemDirectoryHandle;
    const assets: AssetRef[] = [];
    try {
      const assetsDir = await dirHandle.getDirectoryHandle('assets');
      for await (const [name, entry] of (assetsDir as any).entries()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          assets.push({
            id: `asset_${name}`,
            filename: name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            relativePath: `assets/${name}`,
          });
        }
      }
    } catch {
      // assets/ folder may not exist
    }
    return assets;
  }

  async getProjectMetadata(handle: ProjectHandle): Promise<ProjectMetadata> {
    const project = await this.loadProject(handle);
    return {
      id: handle.id,
      name: project.name,
      created: project.created,
      modified: project.modified,
      version: project.version,
    };
  }
}
