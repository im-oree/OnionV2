import React, { useCallback, useMemo } from 'react';
import { Plus, Square, Triangle, Type as TypeI, Image as ImageI, Film, ChevronUp, ChevronDown } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { LayerRow } from './LayerRow';
import { useNavigationStore } from '../../../state/navigationStore';
import { createDefaultLayer } from '../../../config/defaults';
import type { Layer, CompData } from '../../../types/layer';
import { capitalize } from '../../../utils/string';

function genId(): string { return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function createNewLayer(_compId: string, type: Layer['type'], compWidth: number, compHeight: number, layerCount: number): Layer {
  const base = createDefaultLayer(type, `${capitalize(type)} ${layerCount + 1}`);
  const layer: Layer = {
    ...base, id: genId(), zIndex: layerCount + 1,
    transform: { position: { x: 0, y: 0 }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
  };
  switch (type) {
    case 'solid': layer.data = { color: '#4772b3', width: compWidth, height: compHeight }; break;
    case 'shape': layer.data = { type: 'rectangle', width: 200, height: 150, borderRadius: 0 }; break;
    case 'text':  layer.data = { text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400, color: '#ffffff', lineHeight: 1.2, letterSpacing: 0, alignment: 'center' }; break;
    case 'image': layer.data = { assetId: '', naturalWidth: 100, naturalHeight: 100 }; break;
    case 'video': layer.data = { assetId: '', naturalWidth: 100, naturalHeight: 100, duration: 10, muted: false, volume: 1, playbackRate: 1 }; break;
  }
  return layer;
}

export const OutlinerPanel: React.FC = () => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });
  const addLayer = useCompositionStore((s) => s.addLayer);
  const removeLayer = useCompositionStore((s) => s.removeLayer);
  const updateLayer = useCompositionStore((s) => s.updateLayer);
  const reorderLayers = useCompositionStore((s) => s.reorderLayers);

  const selectedIds = useSelectionStore((s) => s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const { select, selectRange, clearSelection } = useSelectionStore();

  const [search, setSearch] = React.useState('');
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [renameLayerId, setRenameLayerId] = React.useState<string | null>(null);

  const handleSelect = useCallback((id: string, ctrl: boolean, shift: boolean) => {
    if (!comp) return;
    if (shift && selectedIds.length > 0) {
      selectRange(selectedIds[selectedIds.length - 1], id, comp.layers.map((l) => l.id));
    } else if (ctrl) {
      const item = { type: 'layer' as const, id, compositionId: comp.id };
      if (selectedIds.includes(id)) useSelectionStore.getState().deselect(id);
      else useSelectionStore.getState().select(item, true);
    } else {
      select({ type: 'layer', id, compositionId: comp.id });
    }
  }, [comp, selectedIds, select, selectRange]);

  const toggleV = useCallback((id: string) => { if (!comp) return; const l = comp.layers.find(x => x.id === id); if (l) updateLayer(comp.id, id, { visible: !l.visible }); }, [comp, updateLayer]);
  const toggleL = useCallback((id: string) => { if (!comp) return; const l = comp.layers.find(x => x.id === id); if (l) updateLayer(comp.id, id, { locked: !l.locked }); }, [comp, updateLayer]);
  const toggleS = useCallback((id: string) => { if (!comp) return; const l = comp.layers.find(x => x.id === id); if (l) updateLayer(comp.id, id, { soloed: !l.soloed }); }, [comp, updateLayer]);

  const moveLayerUp = useCallback((id: string) => {
    if (!comp) return;
    const idx = comp.layers.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    reorderLayers(comp.id, idx, idx - 1);
  }, [comp, reorderLayers]);

  const moveLayerDown = useCallback((id: string) => {
    if (!comp) return;
    const idx = comp.layers.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= comp.layers.length - 1) return;
    reorderLayers(comp.id, idx, idx + 1);
  }, [comp, reorderLayers]);
  const handleRename = useCallback((id: string, name: string) => { if (comp) updateLayer(comp.id, id, { name }); }, [comp, updateLayer]);
  const handleDragStart = useCallback((_id: string) => {}, []);

  const handleDrop = useCallback((targetId: string, draggedId: string, position: 'above' | 'below' | 'child') => {
    if (!comp) return;
    if (draggedId.startsWith('comp:')) {
      const r = useCompositionStore.getState().addCompLayer(comp.id, draggedId.slice(5));
      if (!r.ok && r.reason) console.warn('[OutlinerPanel] Drop rejected:', r.reason);
      return;
    }
    if (position === 'child') updateLayer(comp.id, draggedId, { parentId: targetId });
    else {
      const fromIdx = comp.layers.findIndex((l) => l.id === draggedId);
      const toIdx = comp.layers.findIndex((l) => l.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) reorderLayers(comp.id, fromIdx, position === 'below' ? toIdx + 1 : toIdx);
    }
  }, [comp, reorderLayers, updateLayer]);

  const handleDuplicate = useCallback((id: string) => {
    if (!comp) return;
    const orig = comp.layers.find((l) => l.id === id);
    if (!orig) return;
    import('../../../utils/duplicateLayer').then(({ duplicateLayer }) => {
      const dup = duplicateLayer(comp.id, orig);
      select({ type: 'layer', id: dup.id, compositionId: comp.id });
    });
  }, [comp, select]);

  const handleDeleteLayer = useCallback((id: string) => {
    if (!comp) return; removeLayer(comp.id, id); useSelectionStore.getState().deselect(id);
  }, [comp, removeLayer]);

  const handleDeleteSelected = useCallback(() => {
    if (!comp) return; for (const id of selectedIds) removeLayer(comp.id, id); clearSelection();
  }, [comp, selectedIds, removeLayer, clearSelection]);

  const handleDoubleClick = useCallback((layerId: string) => {
    if (!comp) return;
    const layer = comp.layers.find(l => l.id === layerId);
    if (!layer || layer.type !== 'comp') return;
    const data = layer.data as CompData | undefined;
    if (!data?.sourceCompId) return;
    useNavigationStore.getState().enterComp(data.sourceCompId);
    useCompositionStore.getState().setActiveComposition(data.sourceCompId);
    useSelectionStore.getState().clearSelection();
  }, [comp]);

  const handleAddLayer = useCallback((type: Layer['type']) => {
    if (!comp) return;
    const layer = createNewLayer(comp.id, type, comp.width, comp.height, comp.layers.length);
    addLayer(comp.id, layer);
    select({ type: 'layer', id: layer.id, compositionId: comp.id });
    setShowAddMenu(false);
  }, [comp, addLayer, select]);

  const filteredLayers = useMemo(() => {
    if (!comp) return [];
    if (!search.trim()) return comp.layers;
    const q = search.toLowerCase();
    return comp.layers.filter((l) => l.name.toLowerCase().includes(q));
  }, [comp, search]);

  const getDepth = useCallback((layerId: string, visited = new Set<string>()): number => {
    if (!comp) return 0;
    if (visited.has(layerId)) return 0;
    visited.add(layerId);
    const layer = comp.layers.find((l) => l.id === layerId);
    if (!layer || !layer.parentId) return 0;
    return 1 + getDepth(layer.parentId, visited);
  }, [comp]);

  const rootLayers = useMemo(() => {
    if (!comp) return [];
    return filteredLayers.map((l) => ({ layer: l, depth: getDepth(l.id) }));
  }, [filteredLayers, getDepth]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        handleDeleteSelected();
      }
    };
    const renameHandler = () => {
      const selected = useSelectionStore.getState().selected.find((x) => x.type === 'layer');
      if (selected) { setRenameLayerId(selected.id); setTimeout(() => setRenameLayerId(null), 100); }
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('layer:rename', renameHandler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('layer:rename', renameHandler);
    };
  }, [handleDeleteSelected]);

  if (!comp) {
    return <div className="flex-1 flex items-center justify-center" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>No composition</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 flex-shrink-0" style={{ height: 40, borderBottom: '1px solid var(--color-border)' }}>
        <input
          type="search"
          placeholder="Search layers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none"
          style={{
            height: 28,
            padding: '0 10px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
          }}
        />
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Add layer"
            className="flex items-center justify-center border-0 bg-transparent cursor-pointer transition-colors"
            style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e)=>{ (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; }}
            onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; }}
          >
            <Plus size={15} strokeWidth={2} />
          </button>
          {showAddMenu && (
            <div className="absolute top-full right-0 mt-2 min-w-[180px] z-50 py-1.5"
              style={{ background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-dropdown)', animation: 'dropdown-in 140ms var(--ease-out)' }}
            >
              {[
                { t: 'solid', I: Square }, { t: 'shape', I: Triangle }, { t: 'text', I: TypeI },
                null,
                { t: 'image', I: ImageI }, { t: 'video', I: Film },
              ].map((it, i) => it === null ? (
                <div key={`d${i}`} className="h-px my-1 mx-2" style={{ background: 'var(--color-divider)' }} />
              ) : (
                <button
                  key={it.t}
                  onClick={() => handleAddLayer(it.t as Layer['type'])}
                  className="flex items-center w-full text-left border-0 bg-transparent cursor-pointer transition-colors gap-3"
                  style={{ height: 30, padding: '0 14px', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
                  onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
                  onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
                >
                  <it.I size={14} strokeWidth={1.75} style={{ color: 'var(--color-text-secondary)' }} />
                  <span>New {capitalize(it.t)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {rootLayers.length === 0 ? (
          <div className="text-center py-6" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
            {search ? 'No layers match search' : 'No layers — click + to add'}
          </div>
        ) : (
          rootLayers.map(({ layer, depth }, i) => (
            <LayerRow
              key={layer.id} layer={layer} depth={depth}
              isSelected={selectedIds.includes(layer.id)}
              onSelect={handleSelect}
              onToggleVisibility={toggleV}
              onToggleLock={toggleL}
              onToggleSolo={toggleS}
              onRename={handleRename}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteLayer}
              forceRename={renameLayerId === layer.id}
              onDoubleClick={handleDoubleClick}
              canMoveUp={i > 0}
              canMoveDown={i < rootLayers.length - 1}
              onMoveUp={() => moveLayerUp(layer.id)}
              onMoveDown={() => moveLayerDown(layer.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default OutlinerPanel;