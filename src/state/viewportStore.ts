/**
 * ViewportStore â€” per-composition viewport settings.
 */
import { create } from 'zustand';

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  locked: boolean;
}

export type OutsideBgStyle = 'gradient' | 'dark' | 'checkerboard';

export interface ViewportSettings {
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  showSafeZones: boolean;
  showStats: boolean;
  showRuleOfThirds: boolean;
  showAnchorPoints: boolean;
  showGizmos: boolean;
  wireframeMode: boolean;
  showLayerBounds: boolean;   // black-ish outline for offscreen layers
  tonemapMode: 0 | 1 | 2;
  guidesLocked: boolean;
  snappingEnabled: boolean;
  guides: Guide[];
  zoom: number;
  panX: number;
  panY: number;
  /** Camera-view UI zoom (only affects visual display when viewing through active camera) */
  cameraViewZoom: number;
  /** Fly mode active (Shift+F toggle, FPS-style) */
  flyMode: boolean;
  /** Fly mode speed multiplier (Q slows, E accelerates) */
  flySpeed: number;
  /** Show the focal point marker in Free View */
  showFocalPoint: boolean;
  /** Show checkerboard pattern inside the comp rect for transparency preview */
  showTransparencyCheckerboard: boolean;
  /** Outside-composition background style */
  outsideBgStyle: OutsideBgStyle;
}

export interface ViewportStoreState {
  settings: ViewportSettings;
  setShowGrid: (v: boolean) => void;
  toggleGrid: () => void;
  setShowRulers: (v: boolean) => void;
  toggleRulers: () => void;
  setShowTransparencyCheckerboard: (v: boolean) => void;
  toggleTransparencyCheckerboard: () => void;
  setShowGuides: (v: boolean) => void;
  toggleGuides: () => void;
  setShowSafeZones: (v: boolean) => void;
  toggleSafeZones: () => void;
  setShowStats: (v: boolean) => void;
  toggleStats: () => void;
  setShowRuleOfThirds: (v: boolean) => void;
  toggleRuleOfThirds: () => void;
  setShowAnchorPoints: (v: boolean) => void;
  toggleAnchorPoints: () => void;
  setGizmos: (v: boolean) => void;
  toggleGizmos: () => void;
  setWireframe: (v: boolean) => void;
  toggleWireframe: () => void;
  setShowLayerBounds: (v: boolean) => void;
  toggleLayerBounds: () => void;
  setTonemapMode: (mode: 0 | 1 | 2) => void;
  cycleTonemapMode: () => void;
  setGuidesLocked: (v: boolean) => void;
  setSnappingEnabled: (v: boolean) => void;
  toggleSnapping: () => void;
  addGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (id: string) => void;
  moveGuide: (id: string, position: number) => void;
  clearGuides: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setCameraViewZoom: (z: number) => void;
  setFlyMode: (v: boolean) => void;
  toggleFlyMode: () => void;
  setFlySpeed: (n: number) => void;
  setShowFocalPoint: (v: boolean) => void;
  setOutsideBgStyle: (style: OutsideBgStyle) => void;
}

function genId(): string {
  return `guide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_SETTINGS: ViewportSettings = {
  showGrid: false,
  showRulers: false,
  showGuides: true,
  showSafeZones: false,
  showStats: false,
  showRuleOfThirds: false,
  showAnchorPoints: true,
  showGizmos: true,
  wireframeMode: false,
  showLayerBounds: false, // OFF by default â€” this was the "black outline" you saw
  tonemapMode: 0,
  guidesLocked: false,
  snappingEnabled: true,
  guides: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  cameraViewZoom: 1,
  flyMode: false,
  flySpeed: 500,
  showFocalPoint: true,
  showTransparencyCheckerboard: false,
  outsideBgStyle: 'gradient',
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
  setShowAnchorPoints: (v) => set((s) => ({ settings: { ...s.settings, showAnchorPoints: v } })),
  toggleAnchorPoints: () => set((s) => ({ settings: { ...s.settings, showAnchorPoints: !s.settings.showAnchorPoints } })),
  setGizmos: (v) => set((s) => ({ settings: { ...s.settings, showGizmos: v } })),
  toggleGizmos: () => set((s) => ({ settings: { ...s.settings, showGizmos: !s.settings.showGizmos } })),
  setWireframe: (v) => set((s) => ({ settings: { ...s.settings, wireframeMode: v } })),
  toggleWireframe: () => set((s) => ({ settings: { ...s.settings, wireframeMode: !s.settings.wireframeMode } })),
  setShowLayerBounds: (v) => set((s) => ({ settings: { ...s.settings, showLayerBounds: v } })),
  toggleLayerBounds: () => set((s) => ({ settings: { ...s.settings, showLayerBounds: !s.settings.showLayerBounds } })),
  setTonemapMode: (mode) => set((s) => ({ settings: { ...s.settings, tonemapMode: mode } })),
  cycleTonemapMode: () => set((s) => ({ settings: { ...s.settings, tonemapMode: ((s.settings.tonemapMode + 1) % 3) as 0 | 1 | 2 } })),
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
  setPan: (panX, panY) => set((s) => ({ settings: { ...s.settings, panX, panY } })),
  setCameraViewZoom: (z) => set((s) => ({
    settings: { ...s.settings, cameraViewZoom: Math.max(0.1, Math.min(10, z)) },
  })),
  setFlyMode: (v) => set((s) => ({ settings: { ...s.settings, flyMode: v } })),
  toggleFlyMode: () => set((s) => ({ settings: { ...s.settings, flyMode: !s.settings.flyMode } })),
  setFlySpeed: (n) => set((s) => ({
    settings: { ...s.settings, flySpeed: Math.max(10, Math.min(10000, n)) },
  })),
  setShowFocalPoint: (v) => set((s) => ({ settings: { ...s.settings, showFocalPoint: v } })),
  setOutsideBgStyle: (style) => set((s) => ({ settings: { ...s.settings, outsideBgStyle: style } })),
  setShowTransparencyCheckerboard: (v) => set((s) => ({ settings: { ...s.settings, showTransparencyCheckerboard: v } })),
  toggleTransparencyCheckerboard: () => set((s) => ({ settings: { ...s.settings, showTransparencyCheckerboard: !s.settings.showTransparencyCheckerboard } })),
}));