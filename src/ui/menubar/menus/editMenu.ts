import type { MenuItemDefinition } from '../MenuDropdown';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';

export const editMenu: MenuItemDefinition[] = [
  { id: 'edit.undo', label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => console.log('[Menu] Edit > Undo') },
  { id: 'edit.redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', onClick: () => console.log('[Menu] Edit > Redo') },
  { id: 'edit.sep1', label: '', divider: true, onClick: () => {} },
  { id: 'edit.cut', label: 'Cut', shortcut: 'Ctrl+X', onClick: () => console.log('[Menu] Edit > Cut') },
  { id: 'edit.copy', label: 'Copy', shortcut: 'Ctrl+C', onClick: () => console.log('[Menu] Edit > Copy') },
  { id: 'edit.paste', label: 'Paste', shortcut: 'Ctrl+V', onClick: () => console.log('[Menu] Edit > Paste') },
  { id: 'edit.duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', onClick: () => {
    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return;
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    for (const id of selectedIds) {
      const orig = comp.layers.find((l) => l.id === id);
      if (orig) {
        const dup = { ...JSON.parse(JSON.stringify(orig)), id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: `${orig.name} (copy)`, zIndex: comp.layers.length + 1 };
        compState.addLayer(compId, dup);
      }
    }
  }},
  { id: 'edit.delete', label: 'Delete', shortcut: 'X', onClick: () => {
    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    for (const id of selectedIds) compState.removeLayer(compId, id);
    useSelectionStore.getState().clearSelection();
  }},
  { id: 'edit.sep2', label: '', divider: true, onClick: () => {} },
  { id: 'edit.selectAll', label: 'Select All', shortcut: 'A', onClick: () => {
    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return;
    useSelectionStore.getState().selectAll(compId, comp.layers.map((l) => l.id));
  }},
  { id: 'edit.deselectAll', label: 'Deselect All', shortcut: 'Alt+A', onClick: () => {
    useSelectionStore.getState().deselectAll();
  }},
  { id: 'edit.invertSelection', label: 'Invert Selection', onClick: () => {
    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return;
    const selected = useSelectionStore.getState().getSelectedIds();
    const allIds = comp.layers.map((l) => l.id);
    const inverted = allIds.filter((id) => !selected.includes(id));
    useSelectionStore.getState().replaceSelection(inverted, compId);
  }},
  { id: 'edit.sep3', label: '', divider: true, onClick: () => {} },
  { id: 'edit.preferences', label: 'Preferences...', onClick: () => {
    import('../../dialogs/index').then(({ openPreferencesDialog }) => openPreferencesDialog());
  } },
  { id: 'edit.sep4', label: '', divider: true, onClick: () => {} },
  { id: 'edit.copyKeyframes', label: 'Copy Keyframes', shortcut: 'Ctrl+Shift+C', onClick: () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
  }},
  { id: 'edit.pasteKeyframes', label: 'Paste Keyframes', shortcut: 'Ctrl+Shift+V', onClick: () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
  }},
];
