import React, { useCallback } from 'react';
import type { Layer } from '../../../types/layer';
import { useSelectionStore } from '../../../state/selectionStore';
import { Icon } from '../../common/Icon';

interface TrackLabelsProps {
  layers: Layer[];
  expandedLayers: Set<string>;
  onToggleExpand: (layerId: string) => void;
  propertyPaths: { path: string; label: string }[];
  currentFrame: number;
  compId: string;
}

const LAYER_ICONS: Record<string, string> = {
  solid: 'square', shape: 'triangle', text: 'type',
  image: 'image', video: 'film',
};

export const TrackLabels: React.FC<TrackLabelsProps> = ({
  layers, expandedLayers, onToggleExpand, propertyPaths, currentFrame: _cf, compId,
}) => {
  const selectedIds = useSelectionStore((s) => s.selected.filter((x) => x.type === 'layer').map((x) => x.id));

  const handleSelect = useCallback((layerId: string) => {
    useSelectionStore.getState().select({ type: 'layer', id: layerId, compositionId: compId });
  }, [compId]);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-[28px] px-2 bg-surface-alt border-b border-border text-ui-xs text-text-secondary font-medium">
        <span>Layers</span>
      </div>

      {/* Track rows */}
      <div className="overflow-auto">
        {layers.length === 0 && (
          <div className="text-ui-xs text-text-disabled text-center py-4 px-2">
            No layers
          </div>
        )}

        {layers.map((layer) => {
          const isExpanded = expandedLayers.has(layer.id);
          const isSelected = selectedIds.includes(layer.id);
          return (
            <div key={layer.id}>
              {/* Layer track row */}
              <div
                className={`flex items-center h-[24px] px-1 gap-1 cursor-pointer text-ui-xs select-none border-b border-border/30 ${isSelected ? 'bg-accent/20 text-text-primary' : 'hover:bg-panel-hover'}`}
                onClick={() => handleSelect(layer.id)}
              >
                {/* Expand chevron */}
                <button
                  className="w-[14px] h-[14px] flex items-center justify-center border-0 bg-transparent cursor-pointer text-text-disabled hover:text-text-secondary shrink-0"
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(layer.id); }}
                >
                  <Icon name="chevronRight" size={10}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Layer type icon */}
                <Icon name={(LAYER_ICONS[layer.type] ?? 'circle') as any} size={12}
                  className={`shrink-0 ${isSelected ? 'text-accent' : 'text-text-disabled'}`}
                />

                {/* Name */}
                <span className="truncate flex-1">{layer.name}</span>

                {/* Keyframe diamond indicator */}
                <div className="mr-1 w-[10px] flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="text-accent">
                    <polygon points="4,0 8,4 4,8 0,4" />
                  </svg>
                </div>
              </div>

              {/* Property sub-rows (when expanded) */}
              {isExpanded && propertyPaths.map((prop) => (
                <div
                  key={prop.path}
                  className="flex items-center h-[20px] pl-[30px] pr-1 text-ui-xs text-text-disabled border-b border-border/20 hover:bg-panel-hover cursor-pointer"
                  onClick={() => handleSelect(layer.id)}
                  title={prop.path}
                >
                  <span className="truncate flex-1">{prop.label}</span>
                  {/* Keyframe navigation */}
                  <button className="w-[12px] h-[12px] flex items-center justify-center border-0 bg-transparent cursor-pointer hover:text-text-secondary"
                    title="Add/remove keyframe">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1">
                      <polygon points="4,0 8,4 4,8 0,4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
