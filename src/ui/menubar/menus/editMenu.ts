import type { MenuItemDefinition } from '../MenuDropdown';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useNotificationStore } from '../../../state/notificationStore';

export const editMenu: MenuItemDefinition[] = [
  {
    id: 'edit.undo', label: 'Undo', shortcut: 'Ctrl+Z',
    onClick: () => import('../../../state/historyStore').then(m => m.useHistoryStore?.getState()?.undo?.()).catch(() => {}),
  },
  {
    id: 'edit.redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z',
    onClick: () => import('../../../state/historyStore').then(m => m.useHistoryStore?.getState()?.redo?.()).catch(() => {}),
  },
  { id: 'edit.sep1', label: '', divider: true, onClick: () => {} },
  {
    id: 'edit.duplicate', label: 'Duplicate', shortcut: 'Ctrl+D',
    onClick: () => {
      const cs = useCompositionStore.getState();
      const compId = cs.activeCompositionId;
      if (!compId) return;
      const comp = cs.compositions.find(c => c.id === compId);
      if (!comp) return;
      const ids = useSelectionStore.getState().getSelectedIds();
      const originals = ids.map(id => comp.layers.find(l => l.id === id)).filter(Boolean);
      if (originals.length === 0) return;
      import('../../../utils/duplicateLayer').then(({ duplicateLayers }) => {
        const dups = duplicateLayers(compId, originals as any);
        useSelectionStore.getState().replaceSelection(dups.map(d => d.id), compId);
      });
    },
  },
  {
    id: 'edit.precompose', label: 'Pre-compose...', shortcut: 'Ctrl+Shift+C',
    onClick: () => {
      import('../../../utils/precomp').then(({ precomposeSelectedLayers }) => {
        const r = precomposeSelectedLayers();
        if (!r.ok) {
          useNotificationStore.getState().addNotification({
            type: 'warning',
            message: r.reason ?? 'Cannot pre-compose',
            autoDismiss: 3000,
          });
        } else {
          useNotificationStore.getState().addNotification({
            type: 'success',
            message: `Pre-composed to "${r.newComp?.name}"`,
            autoDismiss: 3000,
          });
        }
      });
    },
  },
  {
    id: 'edit.delete', label: 'Delete', shortcut: 'X / Del',
    onClick: () => {
      const cs = useCompositionStore.getState();
      const compId = cs.activeCompositionId;
      if (!compId) return;
      for (const id of useSelectionStore.getState().getSelectedIds()) cs.removeLayer(compId, id);
      useSelectionStore.getState().clearSelection();
    },
  },
  { id: 'edit.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'edit.selectAll', label: 'Select All', shortcut: 'A',
    onClick: () => {
      const cs = useCompositionStore.getState();
      const compId = cs.activeCompositionId;
      if (!compId) return;
      const comp = cs.compositions.find(c => c.id === compId);
      if (comp) useSelectionStore.getState().selectAll(compId, comp.layers.map(l => l.id));
    },
  },
  {
    id: 'edit.deselectAll', label: 'Deselect All', shortcut: 'Alt+A',
    onClick: () => useSelectionStore.getState().deselectAll(),
  },
  { id: 'edit.sep3', label: '', divider: true, onClick: () => {} },
  {
    id: 'edit.preferences', label: 'Preferences...',
    onClick: () => import('../../dialogs/DialogManager').then(m => m.openPreferencesDialog()),
  },
];
