/**
 * FileSystemAPIAdapter — Primary storage using the File System Access API.
 * Works in Chromium-based browsers. Each project is a folder on the user's disk.
 */
import type { StorageAdapter, StorageCapabilities, ProjectHandle, WorkspaceHandle, AssetRef, ProjectMetadata, SerializedProject, SaveOptions } from './StorageAdapter';

const WORKSPACE_DB = 'OnionWorkspaceHandle';
const WORKSPACE_STORE = 'handles';
const WORKSPACE_KEY = 'fs_workspace';

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
  private _wsDB: IDBDatabase | null = null;
  /** Whether we've attempted restoration from IndexedDB */
  private _restoreAttempted = false;

  async adapterAvailable(): Promise<boolean> {
    return typeof (window as any).showDirectoryPicker === 'function';
  }

  /** Restore workspace handle from IndexedDB. Call on app startup. */
  async ensureWorkspace(): Promise<boolean> {
    // Already restored in memory — return immediately
    if (this.workspaceHandle !== null) return true;

    // Only attempt restore once per session (unless it failed and we need to retry)
    if (this._restoreAttempted) return false;

    // Check if localStorage says workspace was set
    const stored = localStorage.getItem('onion_workspace_set');
    if (stored !== 'true') {
      this._restoreAttempted = true;
      return false;
    }

    // Try to restore from IndexedDB
    try {
      if (typeof indexedDB === 'undefined') {
        this._restoreAttempted = true;
        return false;
      }
      const db = await this._openWorkspaceDB();
      const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
        const tx = db.transaction(WORKSPACE_STORE, 'readonly');
        const store = tx.objectStore(WORKSPACE_STORE);
        const req = store.get(WORKSPACE_KEY);
        req.onsuccess = () => resolve(req.result?.handle);
        req.onerror = () => reject(req.error);
      });

      if (!handle) {
        // Handle was stored but can't be retrieved — clear flag
        localStorage.removeItem('onion_workspace_set');
        this._restoreAttempted = true;
        return false;
      }

      // Verify permission is still valid — but be lenient.
      // After a page refresh, queryPermission returns 'prompt' and requestPermission
      // requires a user gesture (click) to succeed. Calling it from useEffect fails.
      // So we treat 'prompt' as valid — the handle exists and will work once the
      // user interacts with the filesystem (e.g. listing projects, saving).
      try {
        const opts: any = { mode: 'readwrite' };
        let perm: string;
        if (typeof (handle as any).queryPermission === 'function') {
          perm = await (handle as any).queryPermission(opts);
          // Only try requestPermission if we have a user gesture context
          // (calling from useEffect without gesture silently fails)
          if (perm === 'prompt' && typeof (handle as any).requestPermission === 'function') {
            try {
              perm = await (handle as any).requestPermission(opts);
            } catch {
              // requestPermission failed (likely no user gesture) — treat prompt as OK
              perm = 'prompt';
            }
          }
        } else {
          perm = 'granted'; // Permission API not available — assume granted
        }
        // 'granted' and 'prompt' are both OK — the handle is valid.
        // Only 'denied' means the workspace is truly inaccessible.
        if (perm === 'denied') {
          localStorage.removeItem('onion_workspace_set');
          this._restoreAttempted = true;
          return false;
        }
      } catch {
        // Permission API not available — assume granted
      }

      this.workspaceHandle = handle;
      this._restoreAttempted = true;
      return true;
    } catch {
      // Transient IndexedDB error — do NOT set _restoreAttempted so we can retry.
      // The handle may still be valid on next access.
      return false;
    }
  }

  async pickWorkspace(): Promise<WorkspaceHandle> {
    if (!await this.adapterAvailable()) throw new Error('File System API not available');
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    this.workspaceHandle = handle;

    // Persist the handle to IndexedDB for cross-session survival
    try {
      const db = await this._openWorkspaceDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(WORKSPACE_STORE, 'readwrite');
        const store = tx.objectStore(WORKSPACE_STORE);
        store.put({ key: WORKSPACE_KEY, handle });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[Onion] Failed to persist workspace handle to IndexedDB:', err);
    }
    // Always set localStorage flags — even if IndexedDB failed, the in-memory
    // handle is still valid for this session. On next refresh we'll retry IDB.
    localStorage.setItem('onion_workspace_set', 'true');
    localStorage.setItem('onion_workspace_name', handle.name);

    return {
      id: handle.name + '_workspace',
      name: handle.name,
      internal: handle,
    };
  }

  async getWorkspace(): Promise<WorkspaceHandle | null> {
    // Try to restore from IndexedDB if not in memory
    if (!this.workspaceHandle) {
      await this.ensureWorkspace();
    }
    if (this.workspaceHandle) {
      return {
        id: this.workspaceHandle.name + '_workspace',
        name: this.workspaceHandle.name,
        internal: this.workspaceHandle,
      };
    }
    return null;
  }

  /** Open a dedicated IndexedDB for workspace handle persistence (cached connection) */
  private async _openWorkspaceDB(): Promise<IDBDatabase> {
    if (this._wsDB) return this._wsDB;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(WORKSPACE_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
          db.createObjectStore(WORKSPACE_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        this._wsDB = req.result;
        this._wsDB.onclose = () => { this._wsDB = null; };
        this._wsDB.onversionchange = () => { this._wsDB?.close(); this._wsDB = null; };
        resolve(this._wsDB);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Ensure we have write permission to the workspace. Re-requests if needed. */
  private async _ensurePermission(): Promise<boolean> {
    if (!this.workspaceHandle) return false;
    try {
      const opts: any = { mode: 'readwrite' };
      if (typeof (this.workspaceHandle as any).queryPermission === 'function') {
        const perm = await (this.workspaceHandle as any).queryPermission(opts);
        if (perm === 'granted') return true;
        if (perm === 'prompt') {
          const result = await (this.workspaceHandle as any).requestPermission(opts);
          return result === 'granted';
        }
      }
      return true; // No permission API — assume OK
    } catch {
      return true; // Permission API error — try anyway
    }
  }

  async listProjects(): Promise<ProjectHandle[]> {
    if (!this.workspaceHandle) return [];
    await this._ensurePermission();
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

  async createProject(name: string): Promise<ProjectHandle> {
    await this._ensurePermission();
    if (!this.workspaceHandle) throw new Error('No workspace selected');
    // Create the project folder inside the workspace
    const dirHandle = await this.workspaceHandle.getDirectoryHandle(name, { create: true });
    return {
      id: name,
      name,
      adapterType: 'filesystem',
      internal: dirHandle,
    };
  }

  async saveProject(project: SerializedProject, handle: ProjectHandle, _options?: SaveOptions): Promise<void> {
    await this._ensurePermission();
    const dirHandle = handle.internal as FileSystemDirectoryHandle;
    // Write a .bak backup before overwriting, then write directly.
    // The OS ensures createWritable({ keepExistingData: false }) is safe —
    // old content is only removed after the new content is fully written and closed.
    try {
      const existing = await dirHandle.getFileHandle('project.onion');
      const bakHandle = await dirHandle.getFileHandle('project.onion.bak', { create: true });
      const bakWritable = await bakHandle.createWritable({ keepExistingData: false });
      await bakWritable.write(await existing.getFile());
      await bakWritable.close();
    } catch {
      // No existing file to back up
    }
    const fileHandle = await dirHandle.getFileHandle('project.onion', { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    const json = JSON.stringify(project, null, 2);
    await writable.write(json);
    await writable.close();
  }

  async loadProject(handle: ProjectHandle): Promise<SerializedProject> {
    await this._ensurePermission();
    const dirHandle = handle.internal as FileSystemDirectoryHandle;
    if (!dirHandle || typeof dirHandle.getFileHandle !== 'function') {
      throw new Error('Invalid project handle — the project may have been created with a different storage adapter (e.g. IndexedDB). Please create a new project or re-import from the File menu.');
    }
    const fileHandle = await dirHandle.getFileHandle('project.onion');
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as SerializedProject;
  }

  async deleteProject(handle: ProjectHandle): Promise<void> {
    await this._ensurePermission();
    if (this.workspaceHandle) {
      await this.workspaceHandle.removeEntry(handle.name, { recursive: true });
    }
  }

  async saveAsset(blob: Blob, filename: string, projectHandle: ProjectHandle): Promise<AssetRef> {
    await this._ensurePermission();
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
    await this._ensurePermission();
    const dirHandle = projectHandle.internal as FileSystemDirectoryHandle;
    const assetsDir = await dirHandle.getDirectoryHandle('assets');
    const fileHandle = await assetsDir.getFileHandle(ref.filename);
    const file = await fileHandle.getFile();
    return file;
  }

  async deleteAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<void> {
    await this._ensurePermission();
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
