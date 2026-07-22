/**
 * exportStore — export dialog & progress state.
 */
import { create } from 'zustand';
import type {
  ExportSettings,
  ExportProgress,
} from '../renderer/export/types';
import {
  defaultExportSettings,
  defaultProgress,
} from '../renderer/export/types';

interface ExportState {
  settings: ExportSettings;
  progress: ExportProgress;
  // Dialog visibility
  settingsDialogOpen: boolean;
  progressDialogOpen: boolean;

  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  openProgress: () => void;
  closeProgress: () => void;

  updateSettings: (patch: Partial<ExportSettings>) => void;
  replaceSettings: (settings: ExportSettings) => void;
  setProgress: (patch: Partial<ExportProgress>) => void;
  resetProgress: () => void;
}

export const useExportStore = create<ExportState>((set) => ({
  settings: defaultExportSettings(),
  progress: defaultProgress(),
  settingsDialogOpen: false,
  progressDialogOpen: false,

  openSettings: () => set({ settingsDialogOpen: true }),
  closeSettings: () => set({ settingsDialogOpen: false }),
  openProgress: () => set({ progressDialogOpen: true }),
  closeProgress: () => set({ progressDialogOpen: false }),

  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
  replaceSettings: (settings) => set({ settings }),
  setProgress: (patch) =>
    set((s) => ({ progress: { ...s.progress, ...patch } })),
  resetProgress: () => set({ progress: defaultProgress() }),
}));

/**
 * Initialize export settings from active composition — called when opening
 * the settings dialog so fps/duration/name defaults match the current comp.
 */
export function initializeExportSettingsFromComp(comp: {
  width: number; height: number; fps: number; duration: number; name: string;
}): void {
  const store = useExportStore.getState();
  const cur = store.settings;
  // Only overwrite fields that are still at default (comp-derived)
  const next: ExportSettings = { ...cur };
  if (cur.resolutionPresetId === 'comp') {
    next.width = comp.width;
    next.height = comp.height;
  }
  if (cur.fpsPresetId === 'comp') {
    next.fps = comp.fps;
  }
  // Always refresh duration-based range if in 'full' mode
  if (cur.range.mode === 'full') {
    const totalFrames = Math.floor(comp.duration * comp.fps);
    next.range = {
      mode: 'full',
      startFrame: 0,
      endFrame: Math.max(0, totalFrames - 1),
    };
  }
  // Suggest filename if still empty or default
  if (!cur.fileName || cur.fileName === 'export') {
    next.fileName = comp.name.replace(/[^\w\s-]/g, '').trim() || 'export';
  }
  store.replaceSettings(next);
}