/**
 * ViewportStore — per-composition viewport settings.
 */
import { create } from 'zustand';

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  locked: boolean;
}

export interface ViewportSettings {
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  showSafeZones: boolean;
  showStats: boolean;
  showRuleOfThirds: boolean;
  guidesLocked: boolean;
  snappingEnabled: boolean;
  guides: Guide[];
  zoom: number;
  panX: number;
  panY: number;
}

export interface ViewportStoreState {
  settings: ViewportSettings;
  setShowGrid: (v: boolean) => void;
  toggleGrid: () => void;
  setShowRulers: (v: boolean) => void;
  toggleRulers: () => void;
  setShowGuides: (v: boolean) => void;
  toggleGuides: () => void;
  setShowSafeZones: (v: boolean) => void;
  toggleSafeZones: () => void;
  setShowStats: (v: boolean) => void;
  toggleStats: () => void;
  setShowRuleOfThirds: (v: boolean) => void;
  toggleRuleOfThirds: () => void;
  setGuidesLocked: (v: boolean) => void;
  setSnappingEnabled: (v: boolean) => void;
  toggleSnapping: () => void;
  addGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (id: string) => void;
  moveGuide: (id: string, position: number) => void;
  clearGuides: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
}

function genId(): string {
  return `guide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_SETTINGS: ViewportSettings = {
  showGrid: false,          // ← OFF by default (matches ref)
  showRulers: false,        // ← OFF by default (cleaner look)
  showGuides: true,
  showSafeZones: false,
  showStats: false,
  showRuleOfThirds: false,
  guidesLocked: false,
  snappingEnabled: true,
  guides: [],
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const useViewportStore = create<ViewportStoreState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },

  setShowGrid: (v) => set((s) => ({ settings: { ...s.settings, showGrid: v } })),
  toggleGrid: () => set((s) => ({ settings: { ...s.settings, showGrid: !s.settings.showGrid } })),
  setShowRulers: (v) => set((s) => ({ settings: { ...s.settings, showRulers: v } })),
  toggleRulers: () => set((s) => ({ settings: { ...s.settings, showRulers: !s.settings.showRulers } })),
  setShowGuides: (v) => set((s) => ({ settings: { ...s.settings, showGuides: v } })),
  toggleGuides: () => set((s) => ({ settings: { ...s.settings, showGuides: !s.settings.showGuides } })),
  setShowSafeZones: (v) => set((s) => ({ settings: { ...s.settings, showSafeZones: v } })),
  toggleSafeZones: () => set((s) => ({ settings: { ...s.settings, showSafeZones: !s.settings.showSafeZones } })),
  setShowStats: (v) => set((s) => ({ settings: { ...s.settings, showStats: v } })),
  toggleStats: () => set((s) => ({ settings: { ...s.settings, showStats: !s.settings.showStats } })),
  setShowRuleOfThirds: (v) => set((s) => ({ settings: { ...s.settings, showRuleOfThirds: v } })),
  toggleRuleOfThirds: () => set((s) => ({ settings: { ...s.settings, showRuleOfThirds: !s.settings.showRuleOfThirds } })),
  setGuidesLocked: (v) => set((s) => ({ settings: { ...s.settings, guidesLocked: v } })),
  setSnappingEnabled: (v) => set((s) => ({ settings: { ...s.settings, snappingEnabled: v } })),
  toggleSnapping: () => set((s) => ({ settings: { ...s.settings, snappingEnabled: !s.settings.snappingEnabled } })),

  addGuide: (type, position) =>
    set((s) => ({
      settings: {
        ...s.settings,
        guides: [...s.settings.guides, { id: genId(), type, position, locked: false }],
      },
    })),

  removeGuide: (id) =>
    set((s) => ({
      settings: { ...s.settings, guides: s.settings.guides.filter((g) => g.id !== id) },
    })),

  moveGuide: (id, position) =>
    set((s) => ({
      settings: {
        ...s.settings,
        guides: s.settings.guides.map((g) => (g.id === id ? { ...g, position } : g)),
      },
    })),

  clearGuides: () => set((s) => ({ settings: { ...s.settings, guides: [] } })),

  setZoom: (zoom) => set((s) => ({ settings: { ...s.settings, zoom } })),
  setPan: (panX, panY) => set((s) => ({ settings: { ...s.settings, panX: panX, panY: panY } })),
}));