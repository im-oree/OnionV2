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
    if (this.workspaceHandle !== null) {
      // Double-check the handle is still valid (not stale after page refresh)
      if (typeof (this.workspaceHandle as any).getFileHandle === 'function') {
        return true;
      }
      // Handle is stale — clear it and re-restore
      this.workspaceHandle = null;
    }

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

      // CRITICAL: After page refresh, stored FileSystemDirectoryHandle loses
      // its prototype methods (getFileHandle, etc). This is a browser limitation.
      // The ONLY way to get a working handle is via showDirectoryPicker(), which
      // requires a user gesture (click). We cannot auto-restore.
      if (typeof (handle as any).getFileHandle !== 'function') {
        // Handle is stale — user must re-pick the workspace folder.
        // Clear the invalid flag so they can re-pick.
        localStorage.removeItem('onion_workspace_set');
        this._restoreAttempted = true;
        return false;
      }

      // Handle looks valid — try to use it
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

  /** Get a fresh directory handle for a project, re-obtaining from workspace if stale */
  private async _getProjectDir(handle: ProjectHandle): Promise<FileSystemDirectoryHandle> {
    let dirHandle = handle.internal as FileSystemDirectoryHandle;
    
    // Check if the handle is stale (missing getFileHandle method)
    if (!dirHandle || typeof dirHandle.getFileHandle !== 'function') {
      // Try to restore workspace
      if (!this.workspaceHandle) {
        await this.ensureWorkspace();
      }
      
      // If workspace is available, get a fresh project handle
      if (this.workspaceHandle && typeof (this.workspaceHandle as any).getFileHandle === 'function') {
        try {
          dirHandle = await this.workspaceHandle.getDirectoryHandle(handle.name);
          return dirHandle;
        } catch {
          // Project folder not found in workspace
          throw new Error(`Project folder "${handle.name}" not found in workspace. The folder may have been moved or deleted.`);
        }
      }
      
      // Workspace is also stale — user needs to re-pick
      throw new Error('Workspace folder needs to be re-selected. Please use File > Pick Workspace to choose your project folder again.');
    }
    
    return dirHandle;
  }

  async saveProject(project: SerializedProject, handle: ProjectHandle, _options?: SaveOptions): Promise<void> {
    await this._ensurePermission();
    const dirHandle = await this._getProjectDir(handle);
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
    const dirHandle = await this._getProjectDir(handle);
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
    const dirHandle = await this._getProjectDir(projectHandle);
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
    const dirHandle = await this._getProjectDir(projectHandle);
    const assetsDir = await dirHandle.getDirectoryHandle('assets');
    const fileHandle = await assetsDir.getFileHandle(ref.filename);
    const file = await fileHandle.getFile();
    return file;
  }

  async deleteAsset(ref: AssetRef, projectHandle: ProjectHandle): Promise<void> {
    await this._ensurePermission();
    const dirHandle = await this._getProjectDir(projectHandle);
    try {
      const assetsDir = await dirHandle.getDirectoryHandle('assets');
      await assetsDir.removeEntry(ref.filename);
    } catch {
      // File may not exist — ignore
    }
  }

  async listAssets(projectHandle: ProjectHandle): Promise<AssetRef[]> {
    const dirHandle = await this._getProjectDir(projectHandle);
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

  // ── Internal workspace-scoped files ─────────────────────────

  /** Save a file to the workspace root under an arbitrary relative path. */
  async saveInternalFile(relativePath: string, blob: Blob): Promise<void> {
    if (!this.workspaceHandle) {
      const ok = await this.ensureWorkspace();
      if (!ok || !this.workspaceHandle) throw new Error('No workspace available');
    }
    await this._ensurePermission();
    const { dir, filename } = this._splitPath(relativePath);
    const dirHandle = await this._resolveDir(this.workspaceHandle!, dir, true);
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(blob);
    await writable.close();
  }

  async loadInternalFile(relativePath: string): Promise<Blob | null> {
    if (!this.workspaceHandle) {
      const ok = await this.ensureWorkspace();
      if (!ok || !this.workspaceHandle) return null;
    }
    await this._ensurePermission();
    try {
      const { dir, filename } = this._splitPath(relativePath);
      const dirHandle = await this._resolveDir(this.workspaceHandle!, dir, false);
      const fileHandle = await dirHandle.getFileHandle(filename);
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  }

  async deleteInternalFile(relativePath: string): Promise<void> {
    if (!this.workspaceHandle) return;
    await this._ensurePermission();
    try {
      const { dir, filename } = this._splitPath(relativePath);
      const dirHandle = await this._resolveDir(this.workspaceHandle, dir, false);
      await dirHandle.removeEntry(filename);
    } catch {
      /* not present */
    }
  }

  async deleteInternalDirectory(relativePath: string): Promise<void> {
    if (!this.workspaceHandle) return;
    await this._ensurePermission();
    try {
      const parts = relativePath.split('/').filter(Boolean);
      const leaf = parts.pop();
      if (!leaf) return;
      const parent = await this._resolveDir(this.workspaceHandle, parts.join('/'), false);
      await parent.removeEntry(leaf, { recursive: true });
    } catch {
      /* not present */
    }
  }

  private _splitPath(relativePath: string): { dir: string; filename: string } {
    const clean = relativePath.replace(/^\/+/, '');
    const idx = clean.lastIndexOf('/');
    if (idx < 0) return { dir: '', filename: clean };
    return { dir: clean.slice(0, idx), filename: clean.slice(idx + 1) };
  }

  private async _resolveDir(
    root: FileSystemDirectoryHandle,
    dir: string,
    create: boolean,
  ): Promise<FileSystemDirectoryHandle> {
    if (!dir) return root;
    const parts = dir.split('/').filter(Boolean);
    let current = root;
    for (const p of parts) {
      current = await current.getDirectoryHandle(p, { create });
    }
    return current;
  }
}
