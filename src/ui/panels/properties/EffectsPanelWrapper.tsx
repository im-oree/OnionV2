import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { EffectsSection } from './EffectsSection';

export const EffectsPanelWrapper: React.FC = () => {
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );
  const layer = comp?.layers.find((l) => selectedIds.includes(l.id));

  if (!comp) {
    return <div className="p-3 text-ui-xs text-text-disabled">No composition</div>;
  }
  if (!layer) {
    return (
      <div className="p-3 text-ui-xs text-text-disabled italic">
        Select a layer to add effects
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full overflow-auto">
      <EffectsSection layer={layer} compId={comp.id} />
    </div>
  );
};

export default EffectsPanelWrapper;