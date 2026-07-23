import type { MenuItemDefinition } from '../MenuDropdown';
import { openNewCompositionDialog, openPreferencesDialog, openProjectSettings } from '../../dialogs/DialogManager';
import { assetManager } from '../../../storage/AssetManager';
import { StorageManager } from '../../../storage/StorageManager';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useProjectStore } from '../../../state/projectStore';
import { useRecentProjectsStore } from '../../../state/recentProjectsStore';
import { useNotificationStore } from '../../../state/notificationStore';


/**
 * Shared Save As logic — used by both the Save (Ctrl+S) handler
 * when no project handle exists, and the Save As (Ctrl+Shift+S) handler.
 *
 * For File System API adapters: opens a native directory picker so the
 * user can pick where to save.  Creates a project subfolder and stores
 * the handle so subsequent Ctrl+S auto-saves to the same location.
 *
 * For IndexedDB / Download adapters: falls back to the adapter's built-in
 * save flow (IndexedDB stores in-browser; Download triggers a file download).
 */
async function _doSaveAs(): Promise<void> {
  const sm = StorageManager.getInstance();
  const name = useProjectStore.getState().project.name;

  // Ensure the adapter is initialised
  if (!sm.getAdapter()) await sm.detectBestAdapter();
  const adapter = sm.getAdapter();
  if (!adapter) {
    useNotificationStore.getState().addNotification({
      type: 'error',
      message: 'No storage adapter available — cannot save.',
    });
    return;
  }

  if (adapter.type === 'filesystem') {
    // ── File System Access API: native directory picker ──
    const fsAdapter = adapter as any; // FileSystemAPIAdapter
    await fsAdapter.ensureWorkspace();
    const startIn = fsAdapter.workspaceHandle ?? undefined;

    // Show the OS directory picker so the user chooses where to save
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn,
    });

    // Create a project subfolder inside the chosen directory
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectDir = await dirHandle.getDirectoryHandle(safeName, { create: true });

    const handle = {
      id: `fs_${projectDir.name}_${Date.now()}`,
      name: projectDir.name,
      adapterType: 'filesystem' as const,
      internal: projectDir,
    };

    await sm.saveAs(name, handle as any);
  } else {
    // ── Non-FS adapters (IndexedDB, Download) ──
    // createProject generates a handle (ID for IDB, download ID for Download)
    const handle = await adapter.createProject(name);
    await sm.saveAs(name, handle);
  }

  useNotificationStore.getState().addNotification({
    type: 'success',
    message: `Saved "${name}"`,
    autoDismiss: 3000,
  });
}

export const fileMenu: MenuItemDefinition[] = [
  {
    id: 'file.newProject',
    label: 'New Project...',
    shortcut: 'Ctrl+Alt+N',
    onClick: () => {
      // Clear everything and create a fresh blank project
      useCompositionStore.getState().clearAll();
      useProjectStore.getState().newProject();
      assetManager.dispose();
      useSelectionStore.getState().clearSelection();
      StorageManager.getInstance().closeProject();
      useNotificationStore.getState().addNotification({
        type: 'info', message: 'New project created.', autoDismiss: 2000,
      });
    },
  },
  {
    id: 'file.newComposition',
    label: 'New Composition...',
    shortcut: 'Ctrl+N',
    onClick: () => openNewCompositionDialog(),
  },
  { id: 'file.sep0', label: '', divider: true, onClick: () => {} },
  {
    id: 'file.open',
    label: 'Open Project...',
    shortcut: 'Ctrl+O',
    onClick: async () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.onion,.json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          // Read the file directly and deserialize — bypasses storage adapter
          // mismatch issues (the file may have been saved with any adapter).
          const text = await file.text();
          let project: any;
          try {
            project = JSON.parse(text);
          } catch {
            useNotificationStore.getState().addNotification({
              type: 'error',
              message: 'Invalid project file — could not parse JSON.',
            });
            return;
          }
          // Validate
          const { ProjectSerializer } = await import('../../../storage/ProjectSerializer');
          const validation = ProjectSerializer.validate(project);
          if (!validation.valid) {
            useNotificationStore.getState().addNotification({
              type: 'error',
              message: `Invalid project: ${validation.error}`,
            });
            return;
          }
          // Deserialize into stores
          ProjectSerializer.deserialize(project);
          // Set up storage manager with a download-type handle for future saves
          const sm = StorageManager.getInstance();
          const projectName = project.name || file.name.replace(/\.(onion|json)$/, '');
          if (!sm.getAdapter()) await sm.detectBestAdapter();
          sm.closeProject();
          // Create a handle that will persist for Save operations
          const adapter = sm.getAdapter();
          if (adapter) {
            try {
              const handle = await adapter.createProject(projectName);
              // For download adapter, cache the project so Save can re-download
              if (adapter.type === 'download') {
                const dlAdapter = adapter as any;
                if (dlAdapter._projectCache) {
                  dlAdapter._projectCache.set(handle.id, project);
                }
              }
              // Store handle via internal setter (exposed for this use case)
              (sm as any)._currentProjectHandle = handle;
              sm.markClean();
            } catch { /* best effort */ }
          }
          useNotificationStore.getState().addNotification({
            type: 'success',
            message: `Opened "${projectName}"`,
            autoDismiss: 3000,
          });
        };
        input.click();
      } catch (err: any) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          message: `Open failed: ${err?.message ?? 'Unknown error'}`,
        });
      }
    },
  },
  {
    id: 'file.openRecent',
    label: 'Open Recent',
    onClick: () => {
      const recent = useRecentProjectsStore.getState();
      const projs = recent.projects.slice(0, 10);
      if (projs.length === 0) {
        useNotificationStore.getState().addNotification({
          type: 'info', message: 'No recent projects.', autoDismiss: 2000,
        });
        return;
      }
      const latest = projs[0];
      StorageManager.getInstance().load(latest.handle).then(() => {
        useNotificationStore.getState().addNotification({
          type: 'success', message: `Opened "${latest.name}"`, autoDismiss: 3000,
        });
      }).catch(() => {
        useNotificationStore.getState().addNotification({
          type: 'error', message: `Failed to open "${latest.name}"`,
        });
      });
    },
  },
  { id: 'file.sep1', label: '', divider: true, onClick: () => {} },
  {
    id: 'file.save',
    label: 'Save',
    shortcut: 'Ctrl+S',
    onClick: async () => {
      try {
        const sm = StorageManager.getInstance();
        const name = useProjectStore.getState().project.name;

        // If no project handle exists yet, redirect to Save As flow
        // so the user picks where to save.
        if (!sm.currentProjectHandle) {
          await _doSaveAs();
          return;
        }

        await sm.save(name);
      } catch (err: any) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          message: `Save failed: ${err?.message ?? 'Unknown error'}`,
        });
      }
    },
  },
  {
    id: 'file.saveAs',
    label: 'Save As...',
    shortcut: 'Ctrl+Shift+S',
    onClick: async () => {
      try {
        await _doSaveAs();
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.name === 'SecurityError') return; // User cancelled
        useNotificationStore.getState().addNotification({
          type: 'error',
          message: `Save As failed: ${err?.message ?? 'Unknown error'}`,
        });
      }
    },
  },
  { id: 'file.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'file.import',
    label: 'Import File...',
    shortcut: 'Ctrl+I',
    onClick: async () => {
      const { openImportFilePicker } = await import('../../../utils/unifiedImport');
      // Import to project panel only — user drags to timeline manually
      await openImportFilePicker({ addToTimeline: false });
    },
  },
  {
    id: 'file.importFolder',
    label: 'Import Folder...',
    onClick: async () => {
      const { openImportFolderPicker } = await import('../../../utils/unifiedImport');
      await openImportFolderPicker();
    },
  },
  {
    id: 'file.export',
    label: 'Export',
    children: [
      { id: 'file.export.video', label: 'Video...', shortcut: 'Ctrl+M', onClick: () => console.log('[Menu] Export > Video') },
      { id: 'file.export.frame', label: 'Frame...', onClick: () => console.log('[Menu] Export > Frame') },
      { id: 'file.export.package', label: 'Package Project...', onClick: async () => {
        const name = useProjectStore.getState().project.name;
        const project = await import('../../../storage/ProjectSerializer').then(m => m.ProjectSerializer.serialize(name));
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.onionpkg`;
        a.click();
        URL.revokeObjectURL(url);
        useNotificationStore.getState().addNotification({
          type: 'success', message: `Packaged "${name}"`, autoDismiss: 3000,
        });
      }},
    ],
  },
  { id: 'file.sep3', label: '', divider: true, onClick: () => {} },
  {
    id: 'file.cleanUnused',
    label: 'Clean Unused Assets',
    onClick: () => {
      const removed = assetManager.cleanOrphans();
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: removed > 0 ? `Removed ${removed} unused asset${removed > 1 ? 's' : ''}` : 'No unused assets found',
        autoDismiss: 3000,
      });
    },
  },
  {
    id: 'file.preferences',
    label: 'Preferences...',
    shortcut: 'Ctrl+,',
    onClick: () => openPreferencesDialog(),
  },
  {
    id: 'file.projectSettings',
    label: 'Project Settings...',
    onClick: () => openProjectSettings(),
  },
  { id: 'file.sep4', label: '', divider: true, onClick: () => {} },
  {
    id: 'file.closeProject',
    label: 'Close Project',
    shortcut: 'Ctrl+W',
    onClick: () => {
      StorageManager.getInstance().closeProject();
      useProjectStore.getState().newProject();
      useNotificationStore.getState().addNotification({
        type: 'info', message: 'Project closed.', autoDismiss: 2000,
      });
    },
  },
  {
    id: 'file.quit',
    label: 'Quit',
    shortcut: 'Ctrl+Q',
    onClick: () => {
      if (typeof window !== 'undefined') window.close();
    },
  },
];
