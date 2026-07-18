import { create } from 'zustand';

export type SelectableType = 'layer' | 'keyframe' | 'effect' | 'mask' | 'point';

export interface SelectionItem {
  type: SelectableType;
  id: string;
  compositionId: string;
  parentId?: string;
}

export interface SelectionState {
  selected: SelectionItem[];
  lastSelected: SelectionItem | null;
  hoveredId: string | null;

  select: (item: SelectionItem, addToSelection?: boolean) => void;
  deselect: (id: string) => void;
  toggleSelection: (item: SelectionItem) => void;
  selectAll: (compositionId: string, layerIds: string[]) => void;
  deselectAll: () => void;
  clearSelection: () => void;
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  isSelected: (id: string) => boolean;
  getSelectedIds: () => string[];
  getSelectedLayers: () => SelectionItem[];
  setHovered: (id: string | null) => void;
  replaceSelection: (ids: string[], compositionId: string) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: [],
  lastSelected: null,
  hoveredId: null,

  select: (item, addToSelection = false) =>
    set((s) => ({
      selected: addToSelection
        ? s.selected.some((x) => x.id === item.id)
          ? s.selected
          : [...s.selected, item]
        : [item],
      lastSelected: item,
    })),

  deselect: (id) =>
    set((s) => ({
      selected: s.selected.filter((x) => x.id !== id),
      lastSelected: s.lastSelected?.id === id
        ? (s.selected.find((x) => x.id !== id) ?? null)
        : s.lastSelected,
    })),

  toggleSelection: (item) => {
    const s = get();
    if (s.isSelected(item.id)) {
      s.deselect(item.id);
    } else {
      s.select(item, true);
    }
  },

  selectAll: (compositionId, layerIds) =>
    set({
      selected: layerIds.map((id) => ({ type: 'layer' as const, id, compositionId })),
      lastSelected:
        layerIds.length > 0
          ? { type: 'layer' as const, id: layerIds[layerIds.length - 1], compositionId }
          : null,
    }),

  deselectAll: () => set({ selected: [], lastSelected: null, hoveredId: null }),

  clearSelection: () => set({ selected: [], lastSelected: null }),

  selectRange: (fromId, toId, allIds) => {
    const fromIdx = allIds.indexOf(fromId);
    const toIdx = allIds.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeIds = allIds.slice(start, end + 1);
    const lastItem = get().lastSelected;
    const compId = lastItem?.compositionId ?? '';
    set({
      selected: rangeIds.map((id) => ({ type: 'layer' as const, id, compositionId: compId })),
    });
  },

  isSelected: (id) => get().selected.some((s) => s.id === id),

  getSelectedIds: () => get().selected.map((s) => s.id),

  getSelectedLayers: () => get().selected.filter((s) => s.type === 'layer'),

  setHovered: (id) => set({ hoveredId: id }),

  replaceSelection: (ids, compositionId) =>
    set({
      selected: ids.map((id) => ({ type: 'layer' as const, id, compositionId })),
      lastSelected:
        ids.length > 0
          ? { type: 'layer' as const, id: ids[ids.length - 1], compositionId }
          : null,
    }),
}));
