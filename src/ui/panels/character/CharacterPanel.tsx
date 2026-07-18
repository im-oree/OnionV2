import React from 'react';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { TextSection } from '../properties/TextSection';

export const CharacterPanel: React.FC = () => {
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );
  const textLayer = comp?.layers.find(
    (l) => selectedIds.includes(l.id) && l.type === 'text',
  );

  if (!comp) {
    return <div className="p-3 text-ui-xs text-text-disabled">No composition</div>;
  }
  if (!textLayer) {
    return (
      <div className="p-3 text-ui-xs text-text-disabled italic">
        Select a text layer to edit character properties
      </div>
    );
  }
  return <TextSection layer={textLayer} compId={comp.id} />;
};

export default CharacterPanel;