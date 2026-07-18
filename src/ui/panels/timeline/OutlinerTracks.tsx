import React, { useCallback } from 'react';
import type { Layer } from '../../../types/layer';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineExpanded } from './useTimelineExpanded';
import { formatPropertyLabel } from './propertyLabels';
import { useSelectionStore } from '../../../state/selectionStore';
import { Icon } from '../../common/Icon';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu';
import { createLayerInstance } from '../../../utils/createLayerInstance';

interface Props { layers: Layer[]; compId: string; }

const LAYER_ROW_H = 24;
const PROP_ROW_H = 20;

const LAYER_ICONS: Record<string, string> = {
  solid: 'square', shape: 'triangle', text: 'type',
  image: 'image', video: 'film', null: 'circle', comp: 'grid',
};

function addLayerOfType(compId: string, type: Layer['type']): void {
  const state = useCompositionStore.getState();
  const comp = state.compositions.find(c => c.id === compId);
  if (!comp) return;
  const layer = createLayerInstance(type, comp);
  state.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

function buildAddLayerMenu(compId: string): ContextMenuItem[] {
  return [
    { id: 'add.hdr', label: 'Add Layer', disabled: true },
    { id: 'add.d1', divider: true },
    { id: 'add.solid', label: 'Solid', shortcut: 'Ctrl+Y', onClick: () => addLayerOfType(compId, 'solid') },
    { id: 'add.shape', label: 'Shape', onClick: () => addLayerOfType(compId, 'shape') },
    { id: 'add.text', label: 'Text', shortcut: 'Ctrl+T', onClick: () => addLayerOfType(compId, 'text') },
    { id: 'add.null', label: 'Null Object', onClick: () => addLayerOfType(compId, 'null') },
    { id: 'add.adj', label: 'Adjustment Layer', onClick: () => addLayerOfType(compId, 'adjustment') },
    { id: 'add.d2', divider: true },
    { id: 'add.image', label: 'Image', onClick: () => addLayerOfType(compId, 'image') },
    { id: 'add.video', label: 'Video', onClick: () => addLayerOfType(compId, 'video') },
  ];
}

function buildLayerContextMenu(compId: string, layer: Layer): ContextMenuItem[] {
  const cs = useCompositionStore.getState();
  return [
    { id: 'l.hdr', label: layer.name, disabled: true },
    { id: 'l.d1', divider: true },
    {
      id: 'l.rename', label: 'Rename', shortcut: 'F2',
      onClick: () => document.dispatchEvent(new CustomEvent('layer:rename')),
    },
    {
      id: 'l.dup', label: 'Duplicate', shortcut: 'Ctrl+D',
      onClick: () => {
        import('../../../utils/duplicateLayer').then(({ duplicateLayer }) => {
          const dup = duplicateLayer(compId, layer);
          useSelectionStore.getState().select({ type: 'layer', id: dup.id, compositionId: compId });
        });
      },
    },
    {
      id: 'l.vis', label: layer.visible ? 'Hide' : 'Show',
      onClick: () => cs.updateLayer(compId, layer.id, { visible: !layer.visible }),
    },
    {
      id: 'l.lock', label: layer.locked ? 'Unlock' : 'Lock',
      onClick: () => cs.updateLayer(compId, layer.id, { locked: !layer.locked }),
    },
    { id: 'l.d2', divider: true },
    { id: 'l.add', label: 'Add Layer', children: buildAddLayerMenu(compId).filter(i => i.id !== 'add.hdr' && i.id !== 'add.d1') },
    { id: 'l.d3', divider: true },
    {
      id: 'l.del', label: 'Delete', shortcut: 'X',
      onClick: () => {
        cs.removeLayer(compId, layer.id);
        useSelectionStore.getState().deselect(layer.id);
      },
    },
  ];
}

export const OutlinerTracks: React.FC<Props> = ({ layers, compId }) => {
  const engine = useKeyframeStore(s => { void s.revision; return s.engine; });
  const isExpanded = useTimelineExpanded(s => s.isExpanded);
  const toggle = useTimelineExpanded(s => s.toggle);
  const selectedIds = useSelectionStore(s => s.selected.filter(x => x.type === 'layer').map(x => x.id));
  const select = useSelectionStore(s => s.select);
  const ctx = useContextMenu();
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const onClickLayer = useCallback((id: string) => {
    select({ type: 'layer', id, compositionId: compId });
  }, [compId, select]);

  const onLayerContext = useCallback((e: React.MouseEvent, layer: Layer) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(layer.id)) onClickLayer(layer.id);
    ctx.open(e, buildLayerContextMenu(compId, layer));
  }, [ctx, compId, onClickLayer, selectedIds]);

  const onEmptyContext = useCallback((e: React.MouseEvent) => {
    // Only fire when clicking empty area (not a row)
    const t = e.target as HTMLElement;
    if (t.closest('[data-tracks-row="1"]')) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.open(e, buildAddLayerMenu(compId));
  }, [ctx, compId]);

  return (
    <div className="relative select-none min-h-full" onContextMenu={onEmptyContext}>
      {sortedLayers.length === 0 && (
        <div className="p-3 text-ui-xs text-text-disabled text-center">
          No layers — right-click here or click + above to add
        </div>
      )}
      {sortedLayers.map(layer => {
        const expanded = isExpanded(layer.id);
        const props = engine.getAllAnimatedProperties(layer.id);
        const hasKfs = props.length > 0;
        const isSel = selectedIds.includes(layer.id);
        return (
          <div key={layer.id}>
            <div
              data-tracks-row="1"
              className={`flex items-center px-1 gap-1 border-b border-border/20 cursor-pointer text-ui-xs ${
                isSel ? 'bg-accent/25 text-text-primary' : 'text-text-secondary hover:bg-panel-hover'
              }`}
              style={{ height: LAYER_ROW_H }}
              onClick={() => onClickLayer(layer.id)}
              onContextMenu={(e) => onLayerContext(e, layer)}
            >
              <button
                className="w-[14px] h-[14px] flex items-center justify-center border-0 bg-transparent cursor-pointer text-text-disabled hover:text-text-secondary shrink-0"
                onClick={(e) => { e.stopPropagation(); toggle(layer.id); }}
                title={hasKfs ? (expanded ? 'Collapse' : 'Expand') : 'No keyframes'}
                disabled={!hasKfs}
              >
                {hasKfs ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
                    style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 80ms' }}>
                    <polygon points="2,0 6,4 2,8" />
                  </svg>
                ) : <span className="text-[8px]">·</span>}
              </button>
              <Icon
                name={(LAYER_ICONS[layer.type] ?? 'circle') as any}
                size={12}
                className={`shrink-0 ${isSel ? 'text-accent' : 'text-text-disabled'}`}
              />
              <span className="truncate flex-1">{layer.name}</span>
              {hasKfs && (
                <span className="text-[9px] text-text-disabled px-1 rounded-sm bg-black/30 shrink-0">
                  {props.length}
                </span>
              )}
            </div>
            {expanded && props.map(propPath => (
              <PropertyLabelRow
                key={propPath} layerId={layer.id} propPath={propPath}
              />
            ))}
          </div>
        );
      })}
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

const PropertyLabelRow: React.FC<{ layerId: string; propPath: string }> = ({ layerId, propPath }) => {
  const removeAnim = useCallback(() => {
    const store = useKeyframeStore.getState();
    if (store.isPropertyAnimated(layerId, propPath)) {
      store.toggleAnimatedProperty(layerId, propPath);
    } else {
      store.engine.removeAllForProperty(layerId, propPath);
      useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
    }
  }, [layerId, propPath]);

  return (
    <div
      data-tracks-row="1"
      className="flex items-center gap-1 pl-6 pr-1 border-b border-border/10 text-ui-xs text-text-secondary bg-black/10 hover:bg-panel-hover"
      style={{ height: PROP_ROW_H }}
    >
      <span className="w-[10px] h-[10px] flex items-center justify-center text-accent shrink-0">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <polygon points="4,0 8,4 4,8 0,4" />
        </svg>
      </span>
      <span className="truncate flex-1">{formatPropertyLabel(propPath)}</span>
      <button
        onClick={removeAnim}
        title="Remove animation for this property"
        className="w-3 h-3 border-0 bg-transparent cursor-pointer text-text-disabled hover:text-danger shrink-0"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1">
          <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </button>
    </div>
  );
};