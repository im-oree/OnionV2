import React, { useCallback, useRef, useState } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react';
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

function handleTrackDrop(e: React.DragEvent, compId: string, targetLayerId?: string): void {
  e.preventDefault();
  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return;
  if (raw.startsWith('comp:')) {
    const r = useCompositionStore.getState().addCompLayer(compId, raw.slice(5));
    if (!r.ok && r.reason) console.warn('[OutlinerTracks] Drop rejected:', r.reason);
    return;
  }
  // Layer reordering via drag-and-drop
  if (raw.startsWith('layer:') && targetLayerId) {
    const draggedId = raw.slice(6);
    if (draggedId === targetLayerId) return;
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;
    const fromIdx = comp.layers.findIndex(l => l.id === draggedId);
    const toIdx = comp.layers.findIndex(l => l.id === targetLayerId);
    if (fromIdx !== -1 && toIdx !== -1) {
      cs.reorderLayers(compId, fromIdx, toIdx);
    }
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

function buildLayerCtx(compId: string, layer: Layer, idx: number, total: number): ContextMenuItem[] {
  const cs = useCompositionStore.getState();
  const canUp = idx < total - 1;
  const canDown = idx > 0;
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
    { id: 'l.d0', divider: true },
    { id: 'l.up', label: 'Bring Forward', shortcut: 'Ctrl+]', disabled: !canUp,
      onClick: () => cs.reorderLayers(compId, idx, idx + 1) },
    { id: 'l.down', label: 'Send Backward', shortcut: 'Ctrl+[', disabled: !canDown,
      onClick: () => cs.reorderLayers(compId, idx, idx - 1) },
    { id: 'l.d3', divider: true },
    { id: 'l.vis', label: layer.visible ? 'Hide' : 'Show', onClick: () => cs.updateLayer(compId, layer.id, { visible: !layer.visible }) },
    { id: 'l.lock', label: layer.locked ? 'Unlock' : 'Lock', onClick: () => cs.updateLayer(compId, layer.id, { locked: !layer.locked }) },
    { id: 'l.d2', divider: true },
    { id: 'l.del', label: 'Delete', shortcut: 'Del', onClick: () => { cs.removeLayer(compId, layer.id); useSelectionStore.getState().deselect(layer.id); } },
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

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'above' | 'below' | null>(null);
  const dragOverPosRef = useRef<'above' | 'below' | null>(null);

  const onClickLayer = useCallback((id: string) => select({ type: 'layer', id, compositionId: compId }), [compId, select]);
  const onLayerContext = useCallback((e: React.MouseEvent, layer: Layer, layerIdx: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedIds.includes(layer.id)) onClickLayer(layer.id);
    ctx.open(e, buildLayerCtx(compId, layer, layerIdx, sortedLayers.length));
  }, [ctx, compId, onClickLayer, selectedIds, sortedLayers.length]);

  const moveLayerUp = useCallback((id: string) => {
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;
    const idx = comp.layers.findIndex(l => l.id === id);
    // Note: in the store, higher index = rendered on top. "Up" in UI = higher z = higher index.
    if (idx < 0 || idx >= comp.layers.length - 1) return;
    useCompositionStore.getState().reorderLayers(compId, idx, idx + 1);
  }, [compId]);

  const moveLayerDown = useCallback((id: string) => {
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;
    const idx = comp.layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    useCompositionStore.getState().reorderLayers(compId, idx, idx - 1);
  }, [compId]);

  const handleLayerDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    e.dataTransfer.setData('text/plain', `layer:${layerId}`);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

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
        const isDragOver = dragOverId === layer.id;
        return (
          <div key={layer.id} style={{ position: 'relative' }}>
            {/* Drag indicator line — above */}
            {isDragOver && dragOverPos === 'above' && (
              <div style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 2, background: 'var(--color-accent)', borderRadius: 1, zIndex: 10 }} />
            )}
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
              onContextMenu={(e) => onLayerContext(e, layer, li)}
              draggable={true}
              onDragStart={(e) => handleLayerDragStart(e, layer.id)}
              onDragOver={(e) => {
                e.preventDefault(); e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const pos = y < rect.height / 2 ? 'above' : 'below';
                setDropTarget(layer.id);
                setDragOverId(layer.id);
                setDragOverPos(pos);
                dragOverPosRef.current = pos;
              }}
              onDragLeave={() => { setDropTarget(null); setDragOverId(null); setDragOverPos(null); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                setDropTarget(null); setDragOverId(null); setDragOverPos(null);
                handleTrackDrop(e, compId, layer.id);
              }}
            >
              <GripVertical size={12} strokeWidth={2} style={{ color: 'var(--color-text-disabled)', flexShrink: 0, cursor: 'grab' }} />
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
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center"
                style={{ width: 18, height: 18, color: li < sortedLayers.length - 1 ? 'var(--color-text-disabled)' : 'transparent', opacity: li < sortedLayers.length - 1 ? 0.6 : 0, pointerEvents: li < sortedLayers.length - 1 ? 'auto' : 'none' }}
                title="Bring Forward (Ctrl+])"
                onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}
              ><ChevronUp size={13} strokeWidth={2} /></button>
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center"
                style={{ width: 18, height: 18, color: li > 0 ? 'var(--color-text-disabled)' : 'transparent', opacity: li > 0 ? 0.6 : 0, pointerEvents: li > 0 ? 'auto' : 'none' }}
                title="Send Backward (Ctrl+[)"
                onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}
              ><ChevronDown size={13} strokeWidth={2} /></button>
            </div>
            {/* Drag indicator line — below */}
            {isDragOver && dragOverPos === 'below' && (
              <div style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, background: 'var(--color-accent)', borderRadius: 1, zIndex: 10 }} />
            )}
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