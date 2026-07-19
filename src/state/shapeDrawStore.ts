import { create } from 'zustand';

export type DrawPhase = 'idle' | 'drawing';

interface ShapeDrawState {
  phase: DrawPhase;
  presetId: string | null;
  startWorld: { x: number; y: number } | null;
  currentWorld: { x: number; y: number } | null;
  startDraw: (presetId: string, x: number, y: number) => void;
  updateDraw: (x: number, y: number) => void;
  endDraw: () => { presetId: string; startWorld: {x:number;y:number}; endWorld: {x:number;y:number} } | null;
  cancelDraw: () => void;
}

export const useShapeDrawStore = create<ShapeDrawState>((set, get) => ({
  phase: 'idle', presetId: null, startWorld: null, currentWorld: null,

  startDraw: (presetId, x, y) => set({ phase:'drawing', presetId, startWorld:{x,y}, currentWorld:{x,y} }),
  updateDraw: (x, y) => set({ currentWorld:{x,y} }),

  endDraw: () => {
    const s = get();
    if (s.phase!=='drawing'||!s.presetId||!s.startWorld||!s.currentWorld) {
      set({ phase:'idle', presetId:null, startWorld:null, currentWorld:null });
      return null;
    }
    const result = { presetId:s.presetId, startWorld:s.startWorld, endWorld:s.currentWorld };
    set({ phase:'idle', presetId:null, startWorld:null, currentWorld:null });
    return result;
  },

  cancelDraw: () => set({ phase:'idle', presetId:null, startWorld:null, currentWorld:null }),
}));