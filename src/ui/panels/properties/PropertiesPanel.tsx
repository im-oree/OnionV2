/**
 * PropertiesPanel — shows layer properties when layers are selected.
 * Uses imported section components to keep file size under 250 lines.
 * When one layer selected: transform, layer settings, type-specific properties.
 * When multiple: common properties only.
 * When none: composition properties.
 */
import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { TransformSection } from './TransformSection';
import { LayerSection } from './LayerSection';
import { SolidSection } from './SolidSection';
import { ShapeSection } from './ShapeSection';
import { TextSection } from './TextSection';
import { CompSection } from './CompSection';
import { EffectsSection } from './EffectsSection';

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
        <div className="flex-1 overflow-auto">
          <div className="text-ui-xs text-text-disabled p-2 text-center">No composition</div>
        </div>
      </div>
    );
  }

  // No layer selected — show composition properties
  if (selectedLayers.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <CompSection />
        </div>
      </div>
    );
  }

  const singleLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {singleLayer && (
          <div className="flex items-center h-panel-header px-2 gap-1 bg-panel-header border-b border-border">
            <input
              type="text" value={singleLayer.name}
              onChange={(e) =>
                useCompositionStore.getState().updateLayer(comp.id, singleLayer.id, { name: e.target.value })
              }
              className="flex-1 h-[18px] text-ui-xs px-1 bg-transparent border-0 text-text-primary outline-none"
            />
          </div>
        )}

        {selectedLayers.length > 1 && (
          <div className="h-panel-header px-2 flex items-center bg-panel-header border-b border-border">
            <span className="text-ui-xs text-text-secondary">{selectedLayers.length} layers selected</span>
          </div>
        )}

        {singleLayer && (
          <>
            <TransformSection layer={singleLayer} compId={comp.id} />
            <LayerSection layer={singleLayer} compId={comp.id} />
            {/* Phase 5: Effects section */}
            <EffectsSection layer={singleLayer} compId={comp.id} />
          </>
        )}

        {singleLayer?.type === 'solid' && <SolidSection layer={singleLayer} compId={comp.id} />}
        {singleLayer?.type === 'shape' && <ShapeSection layer={singleLayer} compId={comp.id} />}
        {singleLayer?.type === 'text' && <TextSection layer={singleLayer} compId={comp.id} />}
      </div>
    </div>
  );
};

export default PropertiesPanel;
