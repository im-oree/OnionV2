/**
 * CrashRecovery — checks for autosave state on app launch.
 * Since autosave now saves to the same project handle, we track
 * timestamps via localStorage to detect unsaved changes on reload.
 */
import { StorageManager } from './StorageManager';
import { ProjectSerializer } from './ProjectSerializer';
import { useNotificationStore } from '../state/notificationStore';
import type { ProjectHandle } from './StorageAdapter';

export interface AutosaveInfo {
  timestamp: number;
  handle: ProjectHandle;
  exists: boolean;
}

/** Lightweight recovery entry for startup scanning (no handle needed yet) */
export interface PendingRecovery {
  projectId: string;
  projectName: string;
  autosaveTimestamp: number;
  manualSaveTimestamp: number;
}

export class CrashRecovery {
  /**
   * Check if unsaved changes were lost (last autosave > last manual save).
   * Uses localStorage timestamps since we save to the same handle.
   */
  async checkForRecovery(projectHandle: ProjectHandle): Promise<AutosaveInfo | null> {
    const lastSaveKey = `onion_save_${projectHandle.id}`;
    const lastAutoSaveKey = `onion_autosave_${projectHandle.id}`;

    try {
      const lastManualSave = parseInt(localStorage.getItem(lastSaveKey) ?? '0', 10);
      const lastAutoSave = parseInt(localStorage.getItem(lastAutoSaveKey) ?? '0', 10);

      if (lastAutoSave > lastManualSave) {
        return {
          timestamp: lastAutoSave,
          handle: projectHandle,
          exists: true,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Scan all localStorage entries for projects with autosave newer than manual save.
   * Returns a list of projects that may need recovery.
   * The caller must resolve handles from the recent projects store.
   */
  checkAllForRecovery(): PendingRecovery[] {
    const results: PendingRecovery[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('onion_autosave_')) continue;

        const projectId = key.slice('onion_autosave_'.length);
        const autosaveTs = parseInt(localStorage.getItem(key) ?? '0', 10);
        if (autosaveTs <= 0) continue;

        const saveKey = `onion_save_${projectId}`;
        const manualTs = parseInt(localStorage.getItem(saveKey) ?? '0', 10);

        if (autosaveTs > manualTs) {
          results.push({
            projectId,
            projectName: projectId, // Will be resolved by caller
            autosaveTimestamp: autosaveTs,
            manualSaveTimestamp: manualTs,
          });
        }
      }
    } catch {
      // localStorage may be unavailable
    }
    return results;
  }

  /**
   * Restore from the last saved state (the file already reflects the autosave).
   */
  async restore(projectHandle: ProjectHandle): Promise<void> {
    const sm = StorageManager.getInstance();
    const adapter = sm.getAdapter();
    if (!adapter) throw new Error('No storage adapter');

    try {
      const project = await adapter.loadProject(projectHandle);
      ProjectSerializer.deserialize(project);
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Autosave restored successfully.',
        autoDismiss: 4000,
      });
    } catch (err: any) {
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: `Failed to restore autosave: ${err.message ?? 'Unknown error'}`,
      });
      throw err;
    }
  }

  /** Clear recovery markers for a project (after successful manual save or restore) */
  clearRecovery(projectId: string): void {
    try {
      localStorage.removeItem(`onion_autosave_${projectId}`);
      localStorage.removeItem(`onion_save_${projectId}`);
    } catch {}
  }

  /** Track autosave timestamp to localStorage */
  markAutosave(projectId: string): void {
    try {
      localStorage.setItem(`onion_autosave_${projectId}`, String(Date.now()));
    } catch {}
  }

  /** Mark manual save timestamp to localStorage */
  markManualSave(projectId: string): void {
    try {
      localStorage.setItem(`onion_save_${projectId}`, String(Date.now()));
    } catch {}
  }
}

export const crashRecovery = new CrashRecovery();
