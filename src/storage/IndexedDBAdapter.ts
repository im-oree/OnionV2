/**
 * IndexedDBAdapter — Fallback storage using IndexedDB.
 * Used when the File System Access API is unavailable (Firefox, older browsers).
 */
import type { StorageAdapter, StorageCapabilities, ProjectHandle, WorkspaceHandle, AssetRef, ProjectMetadata, SerializedProject, SaveOptions, AssetCategory } from './StorageAdapter';

const DB_NAME = 'OnionProjects';
const DB_VERSION = 1;

export class IndexedDBAdapter implements StorageAdapter {
  readonly type = 'indexeddb' as const;
  readonly name = 'IndexedDB';
  readonly capabilities: StorageCapabilities = {
    directFileAccess: false,
    persistentWorkspace: true,
    largeFiles: false,
    backgroundWrites: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  };

  private db: IDBDatabase | null = null;

  async adapterAvailable(): Promise<boolean> {
    return typeof indexedDB !== 'undefined';
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('autosaves')) {
          db.createObjectStore('autosaves', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async pickWorkspace(): Promise<WorkspaceHandle> {
    return {
      id: 'default_workspace',
      name: 'Default Workspace',
      internal: null,
    };
  }

  async getWorkspace(): Promise<WorkspaceHandle | null> {
    const db = await this.openDB();
    // Check for a persisted workspace first
    const persisted = await new Promise<WorkspaceHandle | null>((resolve) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get('workspace');
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => resolve(null);
    });
    if (persisted) return persisted;
    // No persisted workspace – create a default one so the app
    // can work without requiring the user to pick a physical folder.
    const ws: WorkspaceHandle = {
      id: 'default_workspace',
      name: 'Default Workspace',
      internal: null,
    };
    // Persist it so subsequent calls return immediately
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        store.put({ key: 'workspace', value: ws });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Non-critical — workspace will be re-created on next call
    }
    return ws;
  }

  async listProjects(): Promise<ProjectHandle[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.getAll();
      req.onsuccess = () => {
        const projects = (req.result ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          adapterType: 'indexeddb' as const,
          internal: p.id,
        }));
        resolve(projects);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async createProject(name: string): Promise<ProjectHandle> {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return {
      id,
      name,
      adapterType: 'indexeddb',
      internal: id,
    };
  }

  async saveProject(project: SerializedProject, handle: ProjectHandle, _options?: SaveOptions): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      store.put({
        id: handle.id,
        name: project.name,
        created: project.created,
        modified: project.modified,
        version: project.version,
        data: JSON.stringify(project),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadProject(handle: ProjectHandle): Promise<SerializedProject> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.get(handle.internal);
      req.onsuccess = () => {
        if (!req.result) reject(new Error(`Project "${handle.name}" not found`));
        else resolve(JSON.parse(req.result.data) as SerializedProject);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteProject(handle: ProjectHandle): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      store.delete(handle.internal);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private static inferCategory(mimeType: string, filename: string): AssetCategory {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'fonts';
    if (['glb', 'gltf', 'obj', 'ply', 'stl', 'fbx'].includes(ext)) return '3d-models';
    return 'images';
  }

  async saveAsset(blob: Blob, filename: string, projectHandle: ProjectHandle, category?: AssetCategory): Promise<AssetRef> {
    const db = await this.openDB();
    const cat = category ?? IndexedDBAdapter.inferCategory(blob.type || '', filename);
    const id = `asset_${projectHandle.id}_${cat}_${filename}`;
    const ref: AssetRef = {
      id,
      filename,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size,
      relativePath: `Media/${cat}/${filename}`,
      category: cat,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      const store = tx.objectStore('assets');
      store.put({ id, projectId: projectHandle.id, filename, blob, mimeType: blob.type, size: blob.size, category: cat });
      tx.oncomplete = () => resolve(ref);
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadAsset(ref: AssetRef, _projectHandle: ProjectHandle): Promise<Blob> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readonly');
      const store = tx.objectStore('assets');
      const req = store.get(ref.id);
      req.onsuccess = () => {
        if (!req.result) reject(new Error(`Asset "${ref.filename}" not found`));
        else resolve(req.result.blob);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteAsset(ref: AssetRef, _projectHandle: ProjectHandle): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      const store = tx.objectStore('assets');
      store.delete(ref.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async listAssets(projectHandle: ProjectHandle): Promise<AssetRef[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readonly');
      const store = tx.objectStore('assets');
      const req = store.getAll();
      req.onsuccess = () => {
        const refs: AssetRef[] = (req.result ?? [])
          .filter((a: any) => a.projectId === projectHandle?.id)
          .map((a: any) => ({
            id: a.id,
            filename: a.filename,
            mimeType: a.mimeType || 'application/octet-stream',
            size: a.size || 0,
            relativePath: a.filename,
          }));
        resolve(refs);
      };
      req.onerror = () => reject(req.error);
    });
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
