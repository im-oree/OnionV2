import React from 'react';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';

export const AlignPanel: React.FC = () => {
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );

  const alignTo = (mode: 'centerH' | 'centerV' | 'left' | 'right' | 'top' | 'bottom') => {
    if (!comp || selectedIds.length === 0) return;
    for (const id of selectedIds) {
      const layer = comp.layers.find((l) => l.id === id);
      if (!layer) continue;
      const t = { ...layer.transform, position: { ...layer.transform.position } };
      const hw = comp.width / 2;
      const hh = comp.height / 2;
      if (mode === 'centerH') t.position.x = 0;
      if (mode === 'centerV') t.position.y = 0;
      if (mode === 'left') t.position.x = -hw + 50;
      if (mode === 'right') t.position.x = hw - 50;
      if (mode === 'top') t.position.y = hh - 50;
      if (mode === 'bottom') t.position.y = -hh + 50;
      useCompositionStore.getState().updateLayer(comp.id, id, { transform: t });
    }
  };

  return (
    <div className="flex flex-col h-full p-2 gap-3">
      <div>
        <div className="text-ui-xs text-text-secondary font-medium mb-2 uppercase tracking-wider">
          Align Layers
        </div>
        <div className="grid grid-cols-3 gap-1">
          <AlignBtn label="Left" onClick={() => alignTo('left')} icon="align-l" />
          <AlignBtn label="Center H" onClick={() => alignTo('centerH')} icon="align-cx" />
          <AlignBtn label="Right" onClick={() => alignTo('right')} icon="align-r" />
          <AlignBtn label="Top" onClick={() => alignTo('top')} icon="align-t" />
          <AlignBtn label="Center V" onClick={() => alignTo('centerV')} icon="align-cy" />
          <AlignBtn label="Bottom" onClick={() => alignTo('bottom')} icon="align-b" />
        </div>
      </div>
      {selectedIds.length === 0 && (
        <div className="text-ui-xs text-text-disabled italic">
          Select layers to align
        </div>
      )}
    </div>
  );
};

const AlignBtn: React.FC<{
  label: string;
  icon: string;
  onClick: () => void;
}> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className="h-[28px] flex items-center justify-center gap-1 border border-border rounded-sm bg-surface cursor-pointer text-text-secondary hover:bg-panel-hover hover:text-text-primary text-[9px]"
  >
    {label}
  </button>
);

export default AlignPanel;