import { create } from 'zustand';

export interface PerspectiveCorners {
  /** Four corners: TL, TR, BR, BL in layer-local space (-0.5 to 0.5 normalized) */
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
}

export function defaultCorners(): PerspectiveCorners {
  return {
    tl: { x: -0.5, y: -0.5 },
    tr: { x:  0.5, y: -0.5 },
    br: { x:  0.5, y:  0.5 },
    bl: { x: -0.5, y:  0.5 },
  };
}

interface PerspectiveState {
  /** Per-layer corner overrides. If not present, layer uses defaultCorners */
  cornersByLayer: Record<string, PerspectiveCorners>;
  activeLayerId: string | null;
  dragCorner: 'tl' | 'tr' | 'br' | 'bl' | null;

  setCorners: (layerId: string, corners: PerspectiveCorners) => void;
  updateCorner: (
    layerId: string,
    corner: 'tl' | 'tr' | 'br' | 'bl',
    x: number,
    y: number
  ) => void;
  resetCorners: (layerId: string) => void;
  setActiveLayer: (layerId: string | null) => void;
  setDragCorner: (corner: 'tl' | 'tr' | 'br' | 'bl' | null) => void;
  getCorners: (layerId: string) => PerspectiveCorners;
}

export const usePerspectiveStore = create<PerspectiveState>((set, get) => ({
  cornersByLayer: {},
  activeLayerId: null,
  dragCorner: null,

  setCorners: (layerId, corners) =>
    set(s => ({
      cornersByLayer: { ...s.cornersByLayer, [layerId]: corners },
    })),

  updateCorner: (layerId, corner, x, y) =>
    set(s => {
      const existing = s.cornersByLayer[layerId] ?? defaultCorners();
      return {
        cornersByLayer: {
          ...s.cornersByLayer,
          [layerId]: { ...existing, [corner]: { x, y } },
        },
      };
    }),

  resetCorners: (layerId) =>
    set(s => {
      const next = { ...s.cornersByLayer };
      delete next[layerId];
      return { cornersByLayer: next };
    }),

  setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
  setDragCorner: (corner) => set({ dragCorner: corner }),

  getCorners: (layerId) =>
    get().cornersByLayer[layerId] ?? defaultCorners(),
}));