import type { MenuItemDefinition } from '../MenuDropdown';
import { openNewCompositionDialog, openNewProjectDialog, openProjectSettings } from '../../dialogs/DialogManager';
import { assetManager } from '../../../storage/AssetManager';
import { StorageManager } from '../../../storage/StorageManager';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useProjectStore } from '../../../state/projectStore';
import { useRecentProjectsStore } from '../../../state/recentProjectsStore';
import { useNotificationStore } from '../../../state/notificationStore';
import { createLayerInstance } from '../../../utils/createLayerInstance';

export const fileMenu: MenuItemDefinition[] = [
  {
    id: 'file.newProject',
    label: 'New Project...',
    shortcut: 'Ctrl+Alt+N',
    onClick: () => openNewProjectDialog(),
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
          const sm = StorageManager.getInstance();
          const handle = {
            id: `file_${Date.now()}`,
            name: file.name.replace(/\.(onion|json)$/, ''),
            adapterType: 'download' as const,
            internal: { file },
          };
          await sm.load(handle as any);
          useNotificationStore.getState().addNotification({
            type: 'success',
            message: `Opened "${file.name}"`,
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
        await sm.save(name);
      } catch {
        useNotificationStore.getState().addNotification({
          type: 'error', message: 'Save failed — project may need a Save As first.',
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
        const name = useProjectStore.getState().project.name;
        const project = await import('../../../storage/ProjectSerializer').then(m => m.ProjectSerializer.serialize(name));
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.onion`;
        a.click();
        URL.revokeObjectURL(url);
        useNotificationStore.getState().addNotification({
          type: 'success', message: `Exported "${name}.onion"`, autoDismiss: 3000,
        });
      } catch (err: any) {
        useNotificationStore.getState().addNotification({
          type: 'error', message: `Save As failed: ${err?.message ?? 'Unknown error'}`,
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
      const state = useCompositionStore.getState();
      const compId = state.activeCompositionId;
      if (!compId) return;
      const comp = state.compositions.find((c) => c.id === compId);
      if (!comp) return;
      const assets = await assetManager.importFromFilePicker();
      for (const asset of assets) {
        const type = asset.type === 'video' ? 'video' : 'image';
        const layer = createLayerInstance(type, comp, {
          name: asset.name,
          data: type === 'video'
            ? { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight, duration: asset.duration ?? 10, muted: false, volume: 1, playbackRate: 1 }
            : { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight },
        });
        state.addLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
      }
    },
  },
  {
    id: 'file.importFolder',
    label: 'Import Folder...',
    onClick: async () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.onchange = async () => {
          const files = input.files ? Array.from(input.files) : [];
          const state = useCompositionStore.getState();
          const compId = state.activeCompositionId;
          const comp = compId ? state.compositions.find(c => c.id === compId) : null;
          if (!comp) return;
          let imported = 0;
          for (const file of files) {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
            try {
              const asset = await assetManager.importFile(file);
              const type = asset.type === 'video' ? 'video' : 'image';
              const layer = createLayerInstance(type, comp, {
                name: asset.name,
                data: { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight },
              });
              state.addLayer(compId!, layer);
              imported++;
            } catch { /* skip */ }
          }
          useNotificationStore.getState().addNotification({
            type: 'success', message: `Imported ${imported} files.`, autoDismiss: 3000,
          });
        };
        input.click();
      } catch {}
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
      (window as any).__frameCache?.invalidateAllCompositions();
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
