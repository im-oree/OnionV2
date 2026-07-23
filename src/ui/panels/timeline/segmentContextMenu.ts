import type { ContextMenuItem } from '../../common/ContextMenu';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { getSegments } from '../../../types/layer';

/**
 * Build context menu items for a right-clicked segment.
 */
export function buildSegmentContextMenu(
  layerId: string,
  segmentId: string,
): ContextMenuItem[] {
  const cs = useCompositionStore.getState();
  const sel = useSelectionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return [];

  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return [];

  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return [];

  const segments = getSegments(layer);
  const segment = segments.find(s => s.id === segmentId);
  if (!segment) return [];

  const isMultiSegment = segments.length > 1;
  const segIdx = segments.findIndex(s => s.id === segmentId);

  const items: ContextMenuItem[] = [];

  // Header
  items.push({
    id: 'seg.info',
    label: `${layer.name} - Segment ${segIdx + 1}/${segments.length}`,
    disabled: true,
  });
  items.push({ id: 'seg.d1', divider: true });

  // Move to New Layer
  if (isMultiSegment) {
    items.push({
      id: 'seg.moveToLayer',
      label: 'Move to New Layer',
      onClick: () => {
        document.dispatchEvent(new CustomEvent('segment:moveToLayer', {
          detail: { layerId, segmentId, compId },
        }));
      },
    });
  }

  // Delete Segment
  if (isMultiSegment) {
    items.push({
      id: 'seg.delete',
      label: 'Delete Segment',
      onClick: () => {
        const newSegments = segments.filter(s => s.id !== segmentId);
        cs.updateLayer(compId, layerId, { segments: newSegments });
        // Clear selection for the deleted segment
        sel.deselectSegment(layerId, segmentId);
      },
    });
  }

  // Select all segments
  if (isMultiSegment) {
    items.push({ id: 'seg.d2', divider: true });
    items.push({
      id: 'seg.selectAll',
      label: 'Select All Segments',
      onClick: () => {
        for (const s of segments) {
          sel.selectSegment(layerId, s.id, true);
        }
      },
    });
  }

  return items;
}
