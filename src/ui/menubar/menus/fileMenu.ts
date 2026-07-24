import type { MenuItemDefinition } from '../MenuDropdown';
import {
  openNewCompositionDialog, openPreferencesDialog, openProjectSettings,
  openSaveProjectDialog, openRenameProjectDialog,
} from '../../dialogs/DialogManager';
import { assetManager } from '../../../storage/AssetManager';
import { StorageManager } from '../../../storage/StorageManager';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useProjectStore } from '../../../state/projectStore';
import { useRecentProjectsStore } from '../../../state/recentProjectsStore';
import { useNotificationStore } from '../../../state/notificationStore';

export const fileMenu: MenuItemDefinition[] = [
  {
    id: 'file.newProject',
    label: 'New Project...',
    shortcut: 'Ctrl+Alt+N',
    onClick: () => {
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
          const text = await file.text();
          let project: any;
          try { project = JSON.parse(text); } catch {
            useNotificationStore.getState().addNotification({
              type: 'error', message: 'Invalid project file — could not parse JSON.',
            });
            return;
          }
          const { ProjectSerializer } = await import('../../../storage/ProjectSerializer');
          const validation = ProjectSerializer.validate(project);
          if (!validation.valid) {
            useNotificationStore.getState().addNotification({
              type: 'error', message: `Invalid project: ${validation.error}`,
            });
            return;
          }
          ProjectSerializer.deserialize(project);
          const sm = StorageManager.getInstance();
          const projectName = project.name || file.name.replace(/\.(onion|json)$/, '');
          if (!sm.getAdapter()) await sm.detectBestAdapter();
          sm.closeProject();
          const adapter = sm.getAdapter();
          if (adapter) {
            try {
              const handle = await adapter.createProject(projectName);
              if (adapter.type === 'download') {
                const dlAdapter = adapter as any;
                if (dlAdapter._projectCache) dlAdapter._projectCache.set(handle.id, project);
              }
              (sm as any)._currentProjectHandle = handle;
              sm.markClean();
            } catch { /* best effort */ }
          }
          useNotificationStore.getState().addNotification({
            type: 'success', message: `Opened "${projectName}"`, autoDismiss: 3000,
          });
        };
        input.click();
      } catch (err: any) {
        useNotificationStore.getState().addNotification({
          type: 'error', message: `Open failed: ${err?.message ?? 'Unknown error'}`,
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
      const sm = StorageManager.getInstance();
      // If no project handle yet, open the naming modal
      if (!sm.currentProjectHandle) {
        openSaveProjectDialog('first-save');
        return;
      }
      try {
        const name = useProjectStore.getState().project.name;
        await sm.save(name);
      } catch (err: any) {
        useNotificationStore.getState().addNotification({
          type: 'error', message: `Save failed: ${err?.message ?? 'Unknown error'}`,
        });
      }
    },
  },
  {
    id: 'file.saveAs',
    label: 'Save As...',
    shortcut: 'Ctrl+Shift+S',
    onClick: () => openSaveProjectDialog('save-as'),
  },
  {
    id: 'file.rename',
    label: 'Rename Project...',
    onClick: () => {
      const sm = StorageManager.getInstance();
      if (!sm.currentProjectHandle) {
        useNotificationStore.getState().addNotification({
          type: 'warning',
          message: 'Save the project first before renaming.',
          autoDismiss: 2500,
        });
        openSaveProjectDialog('first-save');
        return;
      }
      openRenameProjectDialog();
    },
  },
  { id: 'file.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'file.import',
    label: 'Import File...',
    shortcut: 'Ctrl+I',
    onClick: async () => {
      const { openImportFilePicker } = await import('../../../utils/unifiedImport');
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