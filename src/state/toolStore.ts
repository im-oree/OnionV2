import { create } from 'zustand';
import { TOOLS } from '../config/constants';

export type ToolId = typeof TOOLS[keyof typeof TOOLS];

export interface ToolSettings {
  polygonSides: number; starRatio: number;
  snapToGrid: boolean; bezierHandles: boolean;
  /** Currently selected shape preset when using shape tool */
  currentShapePresetId: string;
  /** Mask shape mode: rectangle or ellipse */
  maskShape: 'rectangle' | 'ellipse';
}

export interface ToolState {
  activeTool: ToolId; previousTool: ToolId | null;
  toolSettings: ToolSettings;
  isTransforming: boolean; transformMode: 'grab'|'rotate'|'scale'|null;
  setActiveTool: (t: ToolId) => void;
  setPreviousTool: (t: ToolId | null) => void;
  restorePreviousTool: () => void;
  updateToolSettings: (s: Partial<ToolSettings>) => void;
  setTransformMode: (m: 'grab'|'rotate'|'scale'|null) => void;
  setIsTransforming: (t: boolean) => void;
  setShapePreset: (presetId: string) => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: TOOLS.SELECT as ToolId,
  previousTool: null,
  toolSettings: {
    polygonSides: 6, starRatio: 0.5,
    snapToGrid: true, bezierHandles: true,
    currentShapePresetId: 'rectangle',
    maskShape: 'rectangle',
  },
  isTransforming: false, transformMode: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setPreviousTool: (tool) => set({ previousTool: tool }),
  restorePreviousTool: () => { const p = get().previousTool; if (p) set({ activeTool: p, previousTool: null }); },
  updateToolSettings: (settings) => set(s => ({ toolSettings: { ...s.toolSettings, ...settings } })),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setIsTransforming: (t) => set({ isTransforming: t }),
  setShapePreset: (presetId) => set(s => ({ toolSettings: { ...s.toolSettings, currentShapePresetId: presetId } })),
}));