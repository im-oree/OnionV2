/**
 * StorageManager — facade that auto-selects the best available storage adapter
 * and provides a unified high-level API to the rest of the app.
 */
import type { StorageAdapter, ProjectHandle, SerializedProject, AssetRef } from './StorageAdapter';
import { ProjectSerializer } from './ProjectSerializer';
import { useNotificationStore } from '../state/notificationStore';
// Adapters will be imported when their files are created

let _instance: StorageManager | null = null;

export class StorageManager {
  private adapter: StorageAdapter | null = null;
  private _currentProjectHandle: ProjectHandle | null = null;
  private _dirty = false;

  static getInstance(): StorageManager {
    if (!_instance) _instance = new StorageManager();
    return _instance;
  }

  async detectBestAdapter(): Promise<StorageAdapter> {
    // Try File System Access API first (Chromium)
    if (typeof (window as any).showDirectoryPicker === 'function') {
      const { FileSystemAPIAdapter } = await import('./FileSystemAPIAdapter');
      const adapter = new FileSystemAPIAdapter();
      if (await adapter.adapterAvailable()) {
        this.adapter = adapter;
        return adapter;
      }
    }
    // Fallback to IndexedDB
    const { IndexedDBAdapter } = await import('./IndexedDBAdapter');
    const adapter = new IndexedDBAdapter();
    if (await adapter.adapterAvailable()) {
      this.adapter = adapter;
      useNotificationStore.getState().addNotification({
        type: 'info', message: 'Using IndexedDB storage — File System API not available.',
        autoDismiss: 5000,
      });
      return adapter;
    }
    // Last resort: Download adapter
    const { DownloadAdapter } = await import('./DownloadAdapter');
    const fallback = new DownloadAdapter();
    this.adapter = fallback;
    useNotificationStore.getState().addNotification({
      type: 'warning', message: 'Using Download-based storage — limited functionality.',
      autoDismiss: 5000,
    });
    return fallback;
  }

  getAdapter(): StorageAdapter | null {
    return this.adapter;
  }

  get isDirty(): boolean { return this._dirty; }
  get currentProjectHandle(): ProjectHandle | null { return this._currentProjectHandle; }

  markDirty(): void {
    if (!this._dirty) {
      this._dirty = true;
      this._updateTitle();
    }
  }

  markClean(): void {
    this._dirty = false;
    this._updateTitle();
  }

  /** Save current state to the active project file */
  async save(name: string, handle?: ProjectHandle): Promise<void> {
    if (!this.adapter) await this.detectBestAdapter();
    if (!this.adapter) throw new Error('No storage adapter available');

    try {
      const project = ProjectSerializer.serialize(name);
      const h = handle ?? this._currentProjectHandle;
      if (!h) throw new Error('No project handle — save as first');
      await this.adapter.saveProject(project, h);
      this._currentProjectHandle = h;
      this.markClean();
      useNotificationStore.getState().addNotification({
        type: 'success', message: `Saved "${name}"`, autoDismiss: 3000,
      });
    } catch (err: any) {
      useNotificationStore.getState().addNotification({
        type: 'error', message: `Save failed: ${err.message ?? 'Unknown error'}`,
      });
      throw err;
    }
  }

  /** Load a project from a handle */
  async load(handle: ProjectHandle): Promise<SerializedProject> {
    if (!this.adapter) await this.detectBestAdapter();
    if (!this.adapter) throw new Error('No storage adapter available');

    const project = await this.adapter.loadProject(handle);
    ProjectSerializer.deserialize(project);
    this._currentProjectHandle = handle;
    this.markClean();
    return project;
  }

  /** Pick a workspace folder (FS API) */
  async pickWorkspace(): Promise<any> {
    if (!this.adapter) await this.detectBestAdapter();
    if (!this.adapter) throw new Error('No storage adapter');
    const ws = await this.adapter.pickWorkspace();
    return ws;
  }

  /** List projects in the workspace */
  async listProjects(): Promise<ProjectHandle[]> {
    if (!this.adapter) return [];
    return this.adapter.listProjects();
  }

  /** Import an asset file into the current project */
  async importAsset(blob: Blob, filename: string): Promise<AssetRef | null> {
    if (!this.adapter || !this._currentProjectHandle) return null;
    return this.adapter.saveAsset(blob, filename, this._currentProjectHandle);
  }

  /** Load an asset blob by ref */
  async loadAsset(ref: AssetRef): Promise<Blob | null> {
    if (!this.adapter || !this._currentProjectHandle) return null;
    return this.adapter.loadAsset(ref, this._currentProjectHandle);
  }

  private _updateTitle(): void {
    const name = this._currentProjectHandle?.name ?? 'Untitled';
    document.title = this._dirty ? `• ${name} — Onion` : `${name} — Onion`;
  }
}

/** Global helper for stores to mark project dirty */
export function markProjectDirty(): void {
  StorageManager.getInstance().markDirty();
}
