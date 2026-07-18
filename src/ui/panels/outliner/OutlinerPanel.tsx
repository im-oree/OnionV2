import React, { useCallback, useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { LayerRow } from './LayerRow';
import { createDefaultLayer } from '../../../config/defaults';
import type { Layer } from '../../../types/layer';
import { capitalize } from '../../../utils/string';

function genId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createNewLayer(_compId: string, type: Layer['type'], compWidth: number, compHeight: number, layerCount: number): Layer {
  const base = createDefaultLayer(type, `${capitalize(type)} ${layerCount + 1}`);
  const layer: Layer = {
    ...base, id: genId(), zIndex: layerCount + 1,
    transform: { position: { x: 0, y: 0 }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
  };
  switch (type) {
    case 'solid': layer.data = { color: '#4772b3', width: compWidth, height: compHeight }; break;
    case 'shape': layer.data = { type: 'rectangle', width: 200, height: 150, borderRadius: 0 }; break;
    case 'text': layer.data = { text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400, color: '#ffffff', lineHeight: 1.2, letterSpacing: 0, alignment: 'center' }; break;
    case 'image': layer.data = { assetId: '', naturalWidth: 100, naturalHeight: 100 }; break;
    case 'video': layer.data = { assetId: '', naturalWidth: 100, naturalHeight: 100, duration: 10, muted: false, volume: 1, playbackRate: 1 }; break;
  }
  return layer;
}

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SquareIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  );
}

function TriangleIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="12,3 3,21 21,21" />
    </svg>
  );
}

function TypeIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="4,7 4,4 20,4 20,7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function ImageIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
    </svg>
  );
}

function FilmIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
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

  const handleSelect = useCallback((id: string, ctrl: boolean, shift: boolean) => {
    if (!comp) return;
    if (shift && selectedIds.length > 0) {
      selectRange(selectedIds[selectedIds.length - 1], id, comp.layers.map((l) => l.id));
    } else if (ctrl) {
      const item = { type: 'layer' as const, id, compositionId: comp.id };
      if (selectedIds.includes(id)) {
        useSelectionStore.getState().deselect(id);
      } else {
        useSelectionStore.getState().select(item, true);
      }
    } else {
      select({ type: 'layer', id, compositionId: comp.id });
    }
  }, [comp, selectedIds, select, selectRange]);

  const handleToggleVisibility = useCallback((id: string) => {
    if (!comp) return;
    const layer = comp.layers.find((l) => l.id === id);
    if (layer) updateLayer(comp.id, id, { visible: !layer.visible });
  }, [comp, updateLayer]);

  const handleToggleLock = useCallback((id: string) => {
    if (!comp) return;
    const layer = comp.layers.find((l) => l.id === id);
    if (layer) updateLayer(comp.id, id, { locked: !layer.locked });
  }, [comp, updateLayer]);

  const handleToggleSolo = useCallback((id: string) => {
    if (!comp) return;
    const layer = comp.layers.find((l) => l.id === id);
    if (layer) updateLayer(comp.id, id, { soloed: !layer.soloed });
  }, [comp, updateLayer]);

  const handleRename = useCallback((id: string, name: string) => {
    if (!comp) return;
    updateLayer(comp.id, id, { name });
  }, [comp, updateLayer]);

  const handleDragStart = useCallback((_id: string) => {}, []);

  const handleDrop = useCallback((targetId: string, draggedId: string, position: 'above' | 'below' | 'child') => {
    if (!comp) return;
    if (position === 'child') {
      updateLayer(comp.id, draggedId, { parentId: targetId });
    } else {
      const fromIdx = comp.layers.findIndex((l) => l.id === draggedId);
      const toIdx = comp.layers.findIndex((l) => l.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        reorderLayers(comp.id, fromIdx, position === 'below' ? toIdx + 1 : toIdx);
      }
    }
  }, [comp, reorderLayers, updateLayer]);

  const handleDuplicate = useCallback((id: string) => {
    if (!comp) return;
    const orig = comp.layers.find((l) => l.id === id);
    if (!orig) return;
    const dup = { ...JSON.parse(JSON.stringify(orig)), id: genId(), name: `${orig.name} (copy)`, zIndex: comp.layers.length + 1 };
    addLayer(comp.id, dup);
    select({ type: 'layer', id: dup.id, compositionId: comp.id });
  }, [comp, addLayer, select]);

  const handleDeleteLayer = useCallback((id: string) => {
    if (!comp) return;
    removeLayer(comp.id, id);
    useSelectionStore.getState().deselect(id);
  }, [comp, removeLayer]);

  const handleDeleteSelected = useCallback(() => {
    if (!comp) return;
    for (const id of selectedIds) removeLayer(comp.id, id);
    clearSelection();
  }, [comp, selectedIds, removeLayer, clearSelection]);

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

  /** Recursively compute nesting depth by walking parent chain */
  const getDepth = useCallback((layerId: string, visited = new Set<string>()): number => {
    if (!comp) return 0;
    if (visited.has(layerId)) return 0; // cycle guard
    visited.add(layerId);
    const layer = comp.layers.find((l) => l.id === layerId);
    if (!layer || !layer.parentId) return 0;
    return 1 + getDepth(layer.parentId, visited);
  }, [comp]);

  const rootLayers = useMemo(() => {
    if (!comp) return [];
    return filteredLayers.map((l) => ({ layer: l, depth: getDepth(l.id) }));
  }, [filteredLayers, getDepth]);

  // F2 rename handler — listen for the custom event dispatched by KeyboardManager
  const [renameLayerId, setRenameLayerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        handleDeleteSelected();
      }
    };
    const renameHandler = () => {
      const selected = useSelectionStore.getState().selected.find((x) => x.type === 'layer');
      if (selected) {
        setRenameLayerId((prev) => {
          // Toggle to force re-trigger if same layer double-F2'd
          if (prev === selected.id) return null;
          return selected.id;
        });
        setTimeout(() => setRenameLayerId(null), 100);
      }
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('layer:rename', renameHandler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('layer:rename', renameHandler);
    };
  }, [handleDeleteSelected]);

  // Clear rename trigger after it's been consumed
  React.useEffect(() => {
    if (renameLayerId) {
      const timer = setTimeout(() => setRenameLayerId(null), 50);
      return () => clearTimeout(timer);
    }
  }, [renameLayerId]);

  if (!comp) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-ui-xs text-text-disabled">No composition</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border-light bg-surface-alt flex-shrink-0">
        <div className="flex-1 relative">
          <input type="search" placeholder="Search layers..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[18px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="relative">
          <button className="flex items-center justify-center w-[18px] h-[18px] border-0 bg-transparent text-text-secondary rounded-sm cursor-pointer hover:bg-panel-hover"
            onClick={() => setShowAddMenu(!showAddMenu)} title="Add layer"
          >
            <PlusIcon size={12} />
          </button>
          {showAddMenu && (
            <div className="absolute top-full right-0 mt-1 min-w-[140px] bg-panel border border-border rounded-md shadow-dropdown z-50 py-1">
              {(['solid', 'shape', 'text'] as const).map((type) => (
                <button key={type} className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer flex items-center gap-2"
                  onClick={() => handleAddLayer(type)}
                >
                  {type === 'solid' ? <SquareIcon size={12} /> : type === 'shape' ? <TriangleIcon size={12} /> : <TypeIcon size={12} />}
                  <span>New {capitalize(type)}</span>
                </button>
              ))}
              <div className="border-t border-border my-1" />
              {(['image', 'video'] as const).map((type) => (
                <button key={type} className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer flex items-center gap-2"
                  onClick={() => handleAddLayer(type)}
                >
                  {type === 'image' ? <ImageIcon size={12} /> : <FilmIcon size={12} />}
                  <span>New {capitalize(type)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {rootLayers.length === 0 ? (
          <div className="text-ui-xs text-text-disabled text-center py-4">
            {search ? 'No layers match search' : 'No layers — click + to add'}
          </div>
        ) : (
          rootLayers.map(({ layer, depth }) => (
            <LayerRow key={layer.id} layer={layer} depth={depth}
              isSelected={selectedIds.includes(layer.id)}
              onSelect={handleSelect}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onToggleSolo={handleToggleSolo}
              onRename={handleRename}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteLayer}
              forceRename={renameLayerId === layer.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default OutlinerPanel;
