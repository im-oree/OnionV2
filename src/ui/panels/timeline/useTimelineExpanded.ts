import { create } from 'zustand';

interface State {
  expanded: Set<string>;
  toggle: (layerId: string) => void;
  expand: (layerId: string) => void;
  collapse: (layerId: string) => void;
}

export const useTimelineExpanded = create<State>((set) => ({
  expanded: new Set(),
  toggle: (id) => set(s => {
    const next = new Set(s.expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { expanded: next };
  }),
  expand: (id) => set(s => {
    if (s.expanded.has(id)) return {};
    const next = new Set(s.expanded); next.add(id);
    return { expanded: next };
  }),
  collapse: (id) => set(s => {
    if (!s.expanded.has(id)) return {};
    const next = new Set(s.expanded); next.delete(id);
    return { expanded: next };
  }),
}));