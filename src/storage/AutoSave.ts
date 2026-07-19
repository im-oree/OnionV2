/**
 * AutoSave — background auto-save system for crash recovery.
 * Saves the project file directly at a regular interval with toast notifications.
 */
import { StorageManager } from './StorageManager';
import { ProjectSerializer } from './ProjectSerializer';
import { useNotificationStore } from '../state/notificationStore';

export interface AutoSaveConfig {
  intervalMs: number; // default 5 minutes
  enabled: boolean;
  showNotification: boolean;
  maxSnapshots: number; // rolling retention
}

export class AutoSave {
  private _config: AutoSaveConfig = {
    intervalMs: 5 * 60 * 1000,
    enabled: true,
    showNotification: true,
    maxSnapshots: 5,
  };
  private _timerId: ReturnType<typeof setInterval> | null = null;
  private _lastAutoSave: number = 0;
  private _saveCount: number = 0;
  private _onSave: ((timestamp: number) => void) | null = null;

  set onSave(cb: ((timestamp: number) => void) | null) { this._onSave = cb; }

  get config(): AutoSaveConfig { return { ...this._config }; }

  configure(config: Partial<AutoSaveConfig>): void {
    this._config = { ...this._config, ...config };
    if (this._timerId) {
      this.stop();
      this.start();
    }
  }

  start(): void {
    if (this._timerId) return;
    if (!this._config.enabled) return;

    this._timerId = setInterval(() => {
      this._doAutoSave();
    }, this._config.intervalMs);
  }

  stop(): void {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  get lastAutoSave(): number { return this._lastAutoSave; }
  get saveCount(): number { return this._saveCount; }

  /** Force an immediate auto-save (e.g., before close) */
  async saveNow(): Promise<boolean> {
    return this._doAutoSave();
  }

  private async _doAutoSave(): Promise<boolean> {
    const sm = StorageManager.getInstance();
    const handle = sm.currentProjectHandle;
    if (!handle || !sm.isDirty) return false;

    try {
      const project = ProjectSerializer.serialize(handle.name ?? 'Untitled');
      const adapter = sm.getAdapter();
      if (!adapter) return false;

      await adapter.saveProject(project, handle);
      this._lastAutoSave = Date.now();
      this._saveCount++;
      this._onSave?.(this._lastAutoSave);


      if (this._config.showNotification) {
        useNotificationStore.getState().addNotification({
          type: 'info',
          message: 'Auto-saved',
          autoDismiss: 2000,
        });
      }
      return true;
    } catch {
      // Silently fail — autosave is best-effort
      return false;
    }
  }

  dispose(): void {
    this.stop();
  }
}

/** Singleton instance */
export const autoSave = new AutoSave();
