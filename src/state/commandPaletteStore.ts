/**
 * commandPaletteStore — stores registered palette actions and provides
 * fuzzy-search over them. Each action has a unique id, a label, a category,
 * an optional shortcut hint, and an onClick handler.
 */
import { create } from 'zustand';

export interface PaletteAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  keywords?: string[];          // extra search terms
  onClick: () => void;
}

export interface CommandPaletteState {
  actions: PaletteAction[];
  recent: string[];             // last 10 executed action IDs
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  
  registerAction: (action: PaletteAction) => void;
  unregisterAction: (id: string) => void;
  registerActions: (actions: PaletteAction[]) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSearchQuery: (q: string) => void;
  setSelectedIndex: (i: number) => void;
  execute: (id: string) => void;
  search: (query: string) => PaletteAction[];
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  actions: [],
  recent: [],
  isOpen: false,
  searchQuery: '',
  selectedIndex: 0,

  registerAction: (action) => {
    set((s) => {
      if (s.actions.find((a) => a.id === action.id)) return s;
      return { actions: [...s.actions, action] };
    });
  },

  unregisterAction: (id) => {
    set((s) => ({ actions: s.actions.filter((a) => a.id !== id) }));
  },

  registerActions: (actions) => {
    set((s) => {
      const existing = new Set(s.actions.map((a) => a.id));
      const newActions = actions.filter((a) => !existing.has(a.id));
      return { actions: [...s.actions, ...newActions] };
    });
  },

  open: () => set({ isOpen: true, searchQuery: '', selectedIndex: 0 }),
  close: () => set({ isOpen: false, searchQuery: '', selectedIndex: 0 }),
  toggle: () => {
    const s = get();
    if (s.isOpen) s.close();
    else s.open();
  },
  setSearchQuery: (q) => set({ searchQuery: q, selectedIndex: 0 }),
  setSelectedIndex: (i) => set({ selectedIndex: i }),

  execute: (id) => {
    const action = get().actions.find((a) => a.id === id);
    if (!action) return;
    action.onClick();
    set((s) => ({
      recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 10),
      isOpen: false,
      searchQuery: '',
    }));
  },

  search: (query) => {
    const { actions, recent } = get();
    if (!query.trim()) {
      // Show recent actions + rest sorted by category
      const recentSet = new Set(recent);
      const recentItems = recent.map((id) => actions.find((a) => a.id === id)).filter(Boolean) as PaletteAction[];
      const rest = actions.filter((a) => !recentSet.has(a.id));
      return [...recentItems, ...rest];
    }
    const q = query.toLowerCase();
    return actions.filter((a) => {
      if (a.label.toLowerCase().includes(q)) return true;
      if (a.category.toLowerCase().includes(q)) return true;
      if (a.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
      if (a.shortcut?.toLowerCase().includes(q)) return true;
      return false;
    });
  },
}));
