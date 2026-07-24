/**
 * cutoutBrushStore — global brush state for the Manual sub-tab.
 * The viewport overlay reads this to know if it should intercept mouse events.
 */
import { create } from 'zustand';

export type CutoutBrushTool = 'none' | 'keep' | 'erase';

interface CutoutBrushState {
  active: boolean;     // is the Manual sub-tab open + brush enabled
  tool: CutoutBrushTool;
  size: number;        // brush diameter in layer pixels (natural size)
  setActive: (v: boolean) => void;
  setTool: (t: CutoutBrushTool) => void;
  setSize: (n: number) => void;
}

export const useCutoutBrushStore = create<CutoutBrushState>((set) => ({
  active: false,
  tool: 'none',
  size: 40,
  setActive: (v) => set({ active: v, tool: v ? 'keep' : 'none' }),
  setTool: (t) => set({ tool: t }),
  setSize: (n) => set({ size: Math.max(2, Math.min(500, n)) }),
}));