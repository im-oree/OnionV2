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
  /** Properties selected for graph editor display. Keys are `${layerId}::${propertyPath}` */
  selectedPropertyKeys: Set<string>;
  lastSelectedPropertyKey: string | null;

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
  /** Property selection for graph editor */
  selectPropertyKey: (key: string, addToSelection?: boolean) => void;
  deselectPropertyKey: (key: string) => void;
  togglePropertyKey: (key: string) => void;
  selectPropertyRange: (fromKey: string, toKey: string, allKeys: string[]) => void;
  clearPropertySelection: () => void;
  isPropertySelected: (key: string) => boolean;
  hasAnyPropertySelection: () => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: [],
  lastSelected: null,
  hoveredId: null,
  selectedPropertyKeys: new Set<string>(),
  lastSelectedPropertyKey: null,

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

  // ── Property selection (for graph editor) ─────────────────
  selectPropertyKey: (key, addToSelection = false) =>
    set((s) => ({
      selectedPropertyKeys: addToSelection
        ? new Set([...s.selectedPropertyKeys, key])
        : new Set([key]),
      lastSelectedPropertyKey: key,
    })),

  deselectPropertyKey: (key) =>
    set((s) => {
      const next = new Set(s.selectedPropertyKeys);
      next.delete(key);
      return {
        selectedPropertyKeys: next,
        lastSelectedPropertyKey: s.lastSelectedPropertyKey === key
          ? (Array.from(next).pop() ?? null)
          : s.lastSelectedPropertyKey,
      };
    }),

  togglePropertyKey: (key) => {
    const s = get();
    if (s.selectedPropertyKeys.has(key)) {
      s.deselectPropertyKey(key);
    } else {
      s.selectPropertyKey(key, true);
    }
  },

  selectPropertyRange: (fromKey, toKey, allKeys) => {
    const fromIdx = allKeys.indexOf(fromKey);
    const toIdx = allKeys.indexOf(toKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    set({ selectedPropertyKeys: new Set(allKeys.slice(start, end + 1)) });
  },

  clearPropertySelection: () => set({ selectedPropertyKeys: new Set(), lastSelectedPropertyKey: null }),

  isPropertySelected: (key) => get().selectedPropertyKeys.has(key),

  hasAnyPropertySelection: () => get().selectedPropertyKeys.size > 0,
}));
