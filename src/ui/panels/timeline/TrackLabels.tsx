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
  solid: 'rectangle', shape: 'polygon', text: 'text',
  image: 'image', video: 'video',
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
      <div
        className="flex items-center px-3"
        style={{
          height: 32,
          background: 'transparent',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          fontWeight: 500,
        }}
      >
        <span>Layers</span>
      </div>

      <div className="overflow-auto">
        {layers.length === 0 && (
          <div
            className="text-center py-6 px-2"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}
          >
            No layers
          </div>
        )}

        {layers.map((layer) => {
          const isExpanded = expandedLayers.has(layer.id);
          const isSelected = selectedIds.includes(layer.id);
          return (
            <div key={layer.id}>
              <div
                className="flex items-center gap-1.5 cursor-pointer select-none transition-colors"
                onClick={() => handleSelect(layer.id)}
                style={{
                  height: 28,
                  padding: '0 8px',
                  fontSize: 'var(--font-size-sm)',
                  background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
                  color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderBottom: '1px solid var(--color-divider)',
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <button
                  className="w-[16px] h-[16px] flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
                  style={{ color: 'var(--color-text-disabled)' }}
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(layer.id); }}
                >
                  <Icon name="chevronRight" size={11} strokeWidth={2}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <Icon
                  name={(LAYER_ICONS[layer.type] ?? 'ellipse') as any}
                  size={13}
                  strokeWidth={1.75}
                  className="shrink-0"
                />

                <span className="truncate flex-1">{layer.name}</span>

                <div className="mr-1 w-[10px] flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ color: 'var(--color-accent)' }}>
                    <polygon points="4,0 8,4 4,8 0,4" />
                  </svg>
                </div>
              </div>

              {isExpanded && propertyPaths.map((prop) => (
                <div
                  key={prop.path}
                  className="flex items-center cursor-pointer transition-colors"
                  onClick={() => handleSelect(layer.id)}
                  title={prop.path}
                  style={{
                    height: 22,
                    paddingLeft: 34, paddingRight: 8,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-tertiary)',
                    borderBottom: '1px solid var(--color-divider)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span className="truncate flex-1">{prop.label}</span>
                  <button
                    className="w-[14px] h-[14px] flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
                    style={{ color: 'var(--color-text-disabled)' }}
                    title="Add/remove keyframe"
                  >
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