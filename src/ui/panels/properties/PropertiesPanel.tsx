import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { TransformSection } from './TransformSection';
import { LayerSection } from './LayerSection';
import { SolidSection } from './SolidSection';
import { ShapeSection } from './ShapeSection';
import { TextSection } from './TextSection';
import { CompSection } from './CompSection';

export const PropertiesPanel: React.FC = () => {
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );

  const layers = comp?.layers ?? [];
  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id));

  if (!comp) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 text-ui-xs text-text-disabled italic text-center">
          No composition
        </div>
      </div>
    );
  }

  if (selectedLayers.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <CompSection />
      </div>
    );
  }

  const single = selectedLayers.length === 1 ? selectedLayers[0] : null;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {single && (
        <div className="flex items-center px-2 gap-1 bg-panel-header border-b border-border" style={{ height: 28 }}>
          <input
            type="text"
            value={single.name}
            onChange={(e) =>
              useCompositionStore.getState().updateLayer(comp.id, single.id, { name: e.target.value })
            }
            className="flex-1 h-[18px] text-ui-xs px-1 bg-transparent border-0 text-text-primary outline-none"
          />
          <span className="text-[9px] text-text-disabled uppercase">{single.type}</span>
        </div>
      )}

      {selectedLayers.length > 1 && (
        <div className="flex items-center px-2 bg-panel-header border-b border-border" style={{ height: 28 }}>
          <span className="text-ui-xs text-text-secondary">
            {selectedLayers.length} layers selected
          </span>
        </div>
      )}

      {single && (
        <>
          <TransformSection layer={single} compId={comp.id} />
          <LayerSection layer={single} compId={comp.id} />
          {single.type === 'solid' && <SolidSection layer={single} compId={comp.id} />}
          {single.type === 'shape' && <ShapeSection layer={single} compId={comp.id} />}
          {single.type === 'text' && <TextSection layer={single} compId={comp.id} />}
        </>
      )}
    </div>
  );
};

export default PropertiesPanel;