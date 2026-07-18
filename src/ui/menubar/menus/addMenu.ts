import type { MenuItemDefinition } from '../MenuDropdown';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { assetManager } from '../../../storage/AssetManager';
import type { Layer } from '../../../types/layer';

function addNewLayer(type: Layer['type']): void {
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) return;
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;
  const layer = createLayerInstance(type, comp);
  state.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

async function importFromFile(): Promise<void> {
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
}

export const addMenu: MenuItemDefinition[] = [
  {
    id: 'layer.newSolid',
    label: 'New Solid',
    shortcut: 'Ctrl+Y',
    onClick: () => addNewLayer('solid'),
  },
  {
    id: 'layer.newShape',
    label: 'New Shape',
    onClick: () => addNewLayer('shape'),
  },
  {
    id: 'layer.newText',
    label: 'New Text',
    shortcut: 'Ctrl+T',
    onClick: () => addNewLayer('text'),
  },
  {
    id: 'layer.addSep1',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.importFile',
    label: 'Import File...',
    shortcut: 'Ctrl+I',
    onClick: () => { importFromFile(); },
  },
  {
    id: 'layer.addSep2',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.duplicate',
    label: 'Duplicate',
    shortcut: 'Ctrl+D',
    onClick: () => {
      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return;
      const comp = compState.compositions.find((c) => c.id === compId);
      if (!comp) return;
      const selectedIds = useSelectionStore.getState().getSelectedIds();
      const originals = selectedIds.map(id => comp.layers.find(l => l.id === id)).filter(Boolean) as Layer[];
      if (originals.length === 0) return;
      import('../../../utils/duplicateLayer').then(({ duplicateLayers }) => {
        const dups = duplicateLayers(compId, originals);
        useSelectionStore.getState().replaceSelection(dups.map(d => d.id), compId);
      });
    },
  },
  {
    id: 'layer.delete',
    label: 'Delete',
    shortcut: 'X',
    onClick: () => {
      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return;
      const selectedIds = useSelectionStore.getState().getSelectedIds();
      for (const id of selectedIds) {
        compState.removeLayer(compId, id);
      }
      useSelectionStore.getState().clearSelection();
    },
  },
  {
    id: 'layer.rename',
    label: 'Rename',
    shortcut: 'F2',
    onClick: () => console.log('[Menu] Rename layer'),
  },
];
