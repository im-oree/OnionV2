import { create } from 'zustand';

export interface NavEntry { compId: string; }

interface NavState {
  /** Stack of comp IDs — last entry is the current comp being viewed */
  stack: NavEntry[];
  enterComp: (compId: string) => void;
  popTo: (index: number) => void;
  reset: (compId: string) => void;
}

export const useNavigationStore = create<NavState>((set) => ({
  stack: [],
  enterComp: (compId) => set(s => ({ stack: [...s.stack, { compId }] })),
  popTo: (index) => set(s => ({ stack: s.stack.slice(0, index + 1) })),
  reset: (compId) => set({ stack: [{ compId }] }),
}));