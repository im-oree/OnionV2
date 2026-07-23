import React, { useState, useEffect, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { getSegments } from '../../../types/layer';
import { createLayerInstance } from '../../../utils/createLayerInstance';

interface MoveDialogState {
  open: boolean;
  layerId: string;
  segmentId: string;
  compId: string;
}

/**
 * Dialog shown when user right-clicks a segment and picks Move to New Layer.
 * Creates a new layer from the selected segment.
 */
export const MoveSegmentsDialog: React.FC = () => {
  const [state, setState] = useState<MoveDialogState>({
    open: false, layerId: '', segmentId: '', compId: '',
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setState({
        open: true,
        layerId: detail.layerId,
        segmentId: detail.segmentId,
        compId: detail.compId,
      });
    };
    document.addEventListener('segment:moveToLayer', handler);
    return () => document.removeEventListener('segment:moveToLayer', handler);
  }, []);

  const close = useCallback(() => setState(s => ({ ...s, open: false })), []);

  const handleMoveToNewLayer = useCallback(() => {
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === state.compId);
    if (!comp) return;

    const layer = comp.layers.find(l => l.id === state.layerId);
    if (!layer) return;

    const segments = getSegments(layer);
    const seg = segments.find(s => s.id === state.segmentId);
    if (!seg) return;

    const newLayer = createLayerInstance(layer.type, comp, {
      name: `${layer.name} - Seg ${segments.findIndex(s => s.id === seg.id) + 1}`,
      startFrame: seg.startFrame,
      endFrame: seg.endFrame,
      zIndex: layer.zIndex + 1,
      data: layer.data ? JSON.parse(JSON.stringify(layer.data)) : undefined,
    });

    newLayer.segments = [{ ...seg, sourceOffset: seg.sourceOffset }];
    newLayer.startFrame = seg.startFrame;
    newLayer.endFrame = seg.endFrame;

    cs.addLayer(state.compId, newLayer);

    const remainingSegments = segments.filter(s => s.id !== state.segmentId);
    if (remainingSegments.length === 0) {
      cs.removeLayer(state.compId, state.layerId);
    } else {
      cs.updateLayer(state.compId, state.layerId, { segments: remainingSegments });
    }

    useSelectionStore.getState().select({
      type: 'layer', id: newLayer.id, compositionId: state.compId,
    });
    useSelectionStore.getState().clearSegmentSelection();
    close();
  }, [state, close]);

  if (!state.open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={close}
    >
      <div
        className="flex flex-col gap-4 p-6 max-w-sm w-full"
        style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          Move Segment
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Move this segment to a new layer. The original layer keeps its remaining segments.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={close}
            style={{
              padding: '6px 14px', fontSize: 'var(--font-size-sm)', fontWeight: 500,
              background: 'transparent', color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleMoveToNewLayer}
            style={{
              padding: '6px 14px', fontSize: 'var(--font-size-sm)', fontWeight: 500,
              background: 'var(--color-accent)', color: '#fff',
              border: 0, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            Move to New Layer
          </button>
        </div>
      </div>
    </div>
  );
};
