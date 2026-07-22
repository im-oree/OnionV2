/**
 * StorageManager — facade that auto-selects the best available storage adapter
 * and provides a unified high-level API to the rest of the app.
 */
import type { StorageAdapter, ProjectHandle, SerializedProject, AssetRef } from './StorageAdapter';
import { ProjectSerializer } from './ProjectSerializer';
import { useNotificationStore } from '../state/notificationStore';
// crashRecovery.markManualSave is called from App.tsx to avoid circular dependency

type StorageEvent = 'save:start' | 'save:complete' | 'save:error' | 'autosave' | 'load:start' | 'load:complete' | 'load:error' | 'adapter:changed';
interface StorageEventListener { (event: StorageEvent, data?: any): void }

let _instance: StorageManager | null = null;

export class StorageManager {
  private adapter: StorageAdapter | null = null;
  private _currentProjectHandle: ProjectHandle | null = null;
  private _dirty = false;
  private _lastSaveTime: number = 0;
  private _listeners: Map<StorageEvent, StorageEventListener[]> = new Map();

  static getInstance(): StorageManager {
    if (!_instance) _instance = new StorageManager();
    return _instance;
  }

  /** Subscribe to storage events */
  on(event: StorageEvent, listener: StorageEventListener): () => void {
    const list = this._listeners.get(event) ?? [];
    list.push(listener);
    this._listeners.set(event, list);
    return () => {
      const idx = list.indexOf(listener);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  private _emit(event: StorageEvent, data?: any): void {
    const list = this._listeners.get(event);
    if (list) for (const fn of list) fn(event, data);
  }

  async detectBestAdapter(): Promise<StorageAdapter> {
    // Try File System Access API first (Chromium)
    if (typeof (window as any).showDirectoryPicker === 'function') {
      const { FileSystemAPIAdapter } = await import('./FileSystemAPIAdapter');
      const adapter = new FileSystemAPIAdapter();
      if (await adapter.adapterAvailable()) {
        // Check if workspace is already configured before committing to FS adapter
        // If the FS adapter has no persisted workspace handle, fall back to
        // IndexedDB so the app works immediately without requiring the user
        // to pick a physical folder first.
        const hasWs = await adapter.ensureWorkspace();
        if (hasWs) {
          this.adapter = adapter;
          return adapter;
        }
        // FS adapter is available but no workspace → fall through to IndexedDB
        // The user can still opt into a workspace later via File > Pick Workspace.
      }
    }
    // Fallback to IndexedDB
    const { IndexedDBAdapter } = await import('./IndexedDBAdapter');
    const adapter = new IndexedDBAdapter();
    if (await adapter.adapterAvailable()) {
      this.adapter = adapter;
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
  get lastSaveTime(): number { return this._lastSaveTime; }

  /** Check if a workspace is set and restore the handle from IndexedDB if needed.
   *  Returns true if the workspace handle is usable (permission verified). */
  async hasWorkspace(): Promise<boolean> {
    // Auto-initialize adapter if not yet detected (fixes race condition with WelcomeScreen)
    if (!this.adapter) {
      await this.detectBestAdapter();
    }
    const adapter = this.adapter;
    if (!adapter) return false;

    // Try to restore the handle from IndexedDB for FileSystemAPIAdapter
    if (adapter.type === 'filesystem') {
      const fsAdapter = adapter as any;
      if (typeof fsAdapter.ensureWorkspace === 'function') {
        return await fsAdapter.ensureWorkspace();
      }
    }

    // For non-filesystem adapters, check via getWorkspace
    const ws = await adapter.getWorkspace();
    return ws !== null;
  }

  /** Persist workspace selection to localStorage (backup flag).
   *  The actual FileSystemDirectoryHandle is persisted in IndexedDB by the adapter. */
  async persistWorkspace(_handle: any): Promise<void> {
    try {
      localStorage.setItem('onion_workspace_set', 'true');
    } catch {
      // Best-effort
    }
  }

  /** Remove persisted workspace */
  async clearPersistedWorkspace(): Promise<void> {
    try {
      localStorage.removeItem('onion_workspace_set');
      localStorage.removeItem('onion_workspace_name');
    } catch {}
  }

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

    this._emit('save:start');
    try {
      const project = ProjectSerializer.serialize(name);
      const h = handle ?? this._currentProjectHandle;
      if (!h) throw new Error('No project handle — save as first');
      await this.adapter.saveProject(project, h);
      this._currentProjectHandle = h;
      this._lastSaveTime = Date.now();
      this.markClean();
      this._emit('save:complete', { handle: h });
      // Track manual save timestamp (lazy import to avoid circular dep)
      import('./CrashRecovery').then(m => m.crashRecovery.markManualSave(h.id)).catch(() => {});
      useNotificationStore.getState().addNotification({
        type: 'success', message: `Saved "${name}"`, autoDismiss: 3000,
      });
    } catch (err: any) {
      this._emit('save:error', err);
      useNotificationStore.getState().addNotification({
        type: 'error', message: `Save failed: ${err.message ?? 'Unknown error'}`,
      });
      throw err;
    }
  }

  /** Load a project from a handle */
  async load(handle: ProjectHandle): Promise<SerializedProject> {
    // Auto-select the correct adapter based on handle type — prevents
    // "getFileHandle is not a function" when loading IndexedDB projects
    // with the FileSystemAPI adapter active.
    if (handle.adapterType === 'indexeddb' && this.adapter?.type !== 'indexeddb') {
      const { IndexedDBAdapter } = await import('./IndexedDBAdapter');
      this.adapter = new IndexedDBAdapter();
    } else if (handle.adapterType === 'filesystem' && this.adapter?.type !== 'filesystem') {
      const { FileSystemAPIAdapter } = await import('./FileSystemAPIAdapter');
      this.adapter = new FileSystemAPIAdapter();
    } else if (handle.adapterType === 'download' && this.adapter?.type !== 'download') {
      const { DownloadAdapter } = await import('./DownloadAdapter');
      this.adapter = new DownloadAdapter();
    }
    if (!this.adapter) await this.detectBestAdapter();
    if (!this.adapter) throw new Error('No storage adapter available');

    this._emit('load:start');
    try {
      const project = await this.adapter.loadProject(handle);
      const validation = ProjectSerializer.validate(project);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      // Set project handle first so restoreAssets() can list adapter assets
      this._currentProjectHandle = handle;
      // Restore assets FIRST — before deserialize() triggers layer sync,
      // which creates ImageLayerRenderers that call assetManager.getAsset()
      await ProjectSerializer.restoreAssets(project);
      ProjectSerializer.deserialize(project);
      this._lastSaveTime = Date.now();
      this.markClean();
      this._emit('load:complete', { handle, project });
      return project;
    } catch (err: any) {
      this._emit('load:error', err);
      useNotificationStore.getState().addNotification({
        type: 'error', message: `Failed to load project: ${err.message ?? 'Unknown error'}`,
      });
      throw err;
    }
  }

  /** Create a new project in the workspace */
  async createProject(name: string, options?: { template?: string }): Promise<ProjectHandle> {
    if (!this.adapter) await this.detectBestAdapter();
    if (!this.adapter) throw new Error('No storage adapter available');

    // Delegate to adapter — for FS API this creates a folder on disk,
    // for IndexedDB/Download it just generates a handle with an ID.
    const projectHandle = await this.adapter.createProject(name);

    // Initialize with template if provided
    const { useCompositionStore } = await import('../state/compositionStore');
    if (options?.template && options.template !== 'empty') {
      // Add a default composition based on template
      useCompositionStore.getState().addComposition({
        name: `${name} Comp`,
        ...(options.template === 'hd' ? { width: 1920, height: 1080 } : {}),
        ...(options.template === 'square' ? { width: 1080, height: 1080 } : {}),
        ...(options.template === 'vertical' ? { width: 1080, height: 1920 } : {}),
      });
    }

    this._currentProjectHandle = projectHandle;
    this._lastSaveTime = 0;
    this.markDirty();
    return projectHandle;
  }

  /** Save As — creates a new project handle and saves to it */
  async saveAs(name: string, newHandle: ProjectHandle): Promise<void> {
    const oldHandle = this._currentProjectHandle;
    this._currentProjectHandle = newHandle;
    try {
      await this.save(name);
    } catch (e) {
      this._currentProjectHandle = oldHandle;
      throw e;
    }
  }

  /** Close current project and reset state */
  closeProject(): void {
    this._currentProjectHandle = null;
    this._dirty = false;
    this._lastSaveTime = 0;
    this._updateTitle();
    document.title = 'Onion';
  }

  /** Get storage adapter info for UI display */
  getStorageInfo(): { adapterType: string; adapterName: string; capabilities: any } | null {
    if (!this.adapter) return null;
    return {
      adapterType: this.adapter.type,
      adapterName: this.adapter.name,
      capabilities: this.adapter.capabilities,
    };
  }

  /** Pick a workspace folder (FS API) and persist the handle */
  async pickWorkspace(): Promise<any> {
    if (!this.adapter) await this.detectBestAdapter();
    if (!this.adapter) throw new Error('No storage adapter');
    const ws = await this.adapter.pickWorkspace();
    if (ws) {
      await this.persistWorkspace(ws.internal);
    }
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
