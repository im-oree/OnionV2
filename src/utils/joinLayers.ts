/**
 * Shared Join/Parent logic used by viewport context menu, keyboard shortcut,
 * and timeline context menu. Avoids duplicating the parent assignment code.
 */
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import { confirm } from '../ui/common/ConfirmDialog';

/**
 * Join selected layers: parent all selected layers to the last-selected layer.
 * Shows a confirmation dialog before applying.
 * Returns true if the join was performed, false if cancelled.
 */
export async function joinSelectedLayers(): Promise<boolean> {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return false;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return false;

  const selectedIds = useSelectionStore.getState().getSelectedIds();
  if (selectedIds.length < 2) return false;

  // Last selected layer becomes the parent
  const parentLayerId = selectedIds[selectedIds.length - 1];
  const childLayerIds = selectedIds.filter(id => id !== parentLayerId);
  const parentLayer = comp.layers.find(l => l.id === parentLayerId);
  if (!parentLayer) return false;

  const yes = await confirm(
    `Parent ${childLayerIds.length} layer${childLayerIds.length > 1 ? 's' : ''} to "${parentLayer.name}"?`,
    'Join Layers',
    { confirmLabel: 'Join' },
  );

  if (yes) {
    for (const childId of childLayerIds) {
      cs.updateLayer(compId, childId, { parentId: parentLayerId });
    }
  }

  return yes;
}
