import React, { useCallback, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
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
import { LAYER_COLORS } from './layerColors';

interface Props { layers: Layer[]; compId: string; }
const LAYER_ROW_H = 32;
const PROP_ROW_H = 26;

const LAYER_ICONS: Record<string, string> = {
  solid: 'rectangle', shape: 'polygon', text: 'text',
  image: 'image', video: 'video', null: 'ellipse', comp: 'grid',
};

function handleTrackDrop(e: React.DragEvent, compId: string): void {
  e.preventDefault();
  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return;
  if (raw.startsWith('comp:')) {
    const r = useCompositionStore.getState().addCompLayer(compId, raw.slice(5));
    if (!r.ok && r.reason) console.warn('[OutlinerTracks] Drop rejected:', r.reason);
  }
}

function addLayerOfType(compId: string, type: Layer['type']): void {
  const s = useCompositionStore.getState();
  const comp = s.compositions.find(c => c.id === compId); if (!comp) return;
  const layer = createLayerInstance(type, comp);
  s.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

function buildAddLayerMenu(compId: string): ContextMenuItem[] {
  return [
    { id: 'add.hdr', label: 'Add Layer', disabled: true },
    { id: 'add.d1', divider: true },
    { id: 'add.solid', label: 'Solid', onClick: () => addLayerOfType(compId, 'solid') },
    { id: 'add.shape', label: 'Shape', onClick: () => addLayerOfType(compId, 'shape') },
    { id: 'add.text', label: 'Text', onClick: () => addLayerOfType(compId, 'text') },
    { id: 'add.null', label: 'Null Object', onClick: () => addLayerOfType(compId, 'null') },
    { id: 'add.d2', divider: true },
    { id: 'add.image', label: 'Image', onClick: () => addLayerOfType(compId, 'image') },
    { id: 'add.video', label: 'Video', onClick: () => addLayerOfType(compId, 'video') },
  ];
}

function buildLayerCtx(compId: string, layer: Layer): ContextMenuItem[] {
  const cs = useCompositionStore.getState();
  return [
    { id: 'l.hdr', label: layer.name, disabled: true },
    { id: 'l.d1', divider: true },
    { id: 'l.rename', label: 'Rename', shortcut: 'F2', onClick: () => document.dispatchEvent(new CustomEvent('layer:rename')) },
    { id: 'l.dup', label: 'Duplicate', shortcut: 'Ctrl+D', onClick: () => {
      import('../../../utils/duplicateLayer').then(({ duplicateLayer }) => {
        const dup = duplicateLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: dup.id, compositionId: compId });
      });
    }},
    { id: 'l.vis', label: layer.visible ? 'Hide' : 'Show', onClick: () => cs.updateLayer(compId, layer.id, { visible: !layer.visible }) },
    { id: 'l.lock', label: layer.locked ? 'Unlock' : 'Lock', onClick: () => cs.updateLayer(compId, layer.id, { locked: !layer.locked }) },
    { id: 'l.d2', divider: true },
    { id: 'l.del', label: 'Delete', onClick: () => { cs.removeLayer(compId, layer.id); useSelectionStore.getState().deselect(layer.id); } },
  ];
}

export const OutlinerTracks: React.FC<Props> = ({ layers, compId }) => {
  const engine = useKeyframeStore(s => { void s.revision; return s.engine; });
  const expandedSet = useTimelineExpanded(s => s.expanded);
  const toggle = useTimelineExpanded(s => s.toggle);
  const selectedIds = useSelectionStore(s => s.selected.filter(x => x.type === 'layer').map(x => x.id));
  const select = useSelectionStore(s => s.select);
  const ctx = useContextMenu();
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const onClickLayer = useCallback((id: string) => select({ type: 'layer', id, compositionId: compId }), [compId, select]);
  const onLayerContext = useCallback((e: React.MouseEvent, layer: Layer) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedIds.includes(layer.id)) onClickLayer(layer.id);
    ctx.open(e, buildLayerCtx(compId, layer));
  }, [ctx, compId, onClickLayer, selectedIds]);

  const onEmptyContext = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-tracks-row]')) return;
    e.preventDefault(); e.stopPropagation();
    ctx.open(e, buildAddLayerMenu(compId));
  }, [ctx, compId]);

  return (
    <div className="relative select-none min-h-full" onContextMenu={onEmptyContext}>
      {sortedLayers.length === 0 && (
        <div className="p-4 text-center"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
          onDrop={(e) => handleTrackDrop(e, compId)}
        >No layers — right-click or click + to add</div>
      )}
      {sortedLayers.map((layer, li) => {
        const expanded = expandedSet.has(layer.id);
        const props = engine.getAllAnimatedProperties(layer.id);
        const hasKfs = props.length > 0;
        const isSel = selectedIds.includes(layer.id);
        const palette = LAYER_COLORS[li % LAYER_COLORS.length];
        return (
          <div key={layer.id}>
            <div data-tracks-row="1"
              className="flex items-center gap-2 cursor-pointer transition-colors"
              style={{
                height: LAYER_ROW_H, padding: '0 8px',
                borderBottom: '1px solid var(--color-divider)',
                background: isSel ? 'var(--color-accent-muted)' : 'transparent',
                color: isSel ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                boxShadow: dropTarget === layer.id ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
              }}
              onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
              onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              onClick={() => onClickLayer(layer.id)}
              onContextMenu={(e) => onLayerContext(e, layer)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget(layer.id); e.dataTransfer.dropEffect = 'copy'; }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget(null); handleTrackDrop(e, compId); }}
            >
              <div className="shrink-0 rounded-full" style={{
                width: 4, height: 16,
                background: `linear-gradient(180deg, ${palette.from}, ${palette.to})`,
              }} />
              <button
                className="w-4 h-4 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
                style={{ color: hasKfs ? 'var(--color-text-tertiary)' : 'transparent' }}
                onClick={(e) => { e.stopPropagation(); toggle(layer.id); }}
                disabled={!hasKfs}
              >
                {hasKfs && <ChevronRight size={11} strokeWidth={2}
                  style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} />}
              </button>
              <Icon name={(LAYER_ICONS[layer.type] ?? 'ellipse') as any} size={14} strokeWidth={1.75}
                className={`shrink-0 ${isSel ? 'text-accent' : ''}`} />
              <span className="truncate flex-1" style={{ fontWeight: isSel ? 500 : 400 }}>{layer.name}</span>
              {hasKfs && (
                <span className="shrink-0" style={{
                  fontSize: 9, padding: '1px 6px', fontWeight: 600,
                  color: palette.accent, background: `${palette.accent}18`,
                  borderRadius: 999, fontFamily: 'var(--font-family-mono)',
                }}>{props.length}</span>
              )}
            </div>
            {expanded && props.map(propPath => (
              <div key={propPath} data-tracks-row="1"
                className="flex items-center gap-2 transition-colors"
                style={{
                  height: PROP_ROW_H, padding: '0 8px 0 38px',
                  borderBottom: '1px solid var(--color-divider)',
                  background: 'rgba(0,0,0,0.06)',
                  fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.06)'}
              >
                <svg width="7" height="7" viewBox="0 0 8 8" className="shrink-0" style={{ color: palette.accent }}>
                  <polygon points="4,0 8,4 4,8 0,4" fill="currentColor" />
                </svg>
                <span className="truncate flex-1">{formatPropertyLabel(propPath)}</span>
                <button
                  onClick={() => {
                    const store = useKeyframeStore.getState();
                    if (store.isPropertyAnimated(layer.id, propPath)) store.toggleAnimatedProperty(layer.id, propPath);
                    else { store.engine.removeAllForProperty(layer.id, propPath); useKeyframeStore.setState(s => ({ revision: s.revision + 1 })); }
                  }}
                  className="border-0 bg-transparent cursor-pointer transition-colors"
                  style={{ color: 'var(--color-text-disabled)' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)'}
                  title="Remove animation"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        );
      })}
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};