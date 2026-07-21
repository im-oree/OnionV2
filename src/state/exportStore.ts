/**
 * exportStore — drives the export/render panel state machine.
 */
import { create } from 'zustand';

export type ExportFormat = 'png-sequence' | 'webm' | 'frame-png' | 'frame-jpg';
export type ExportResolution = 'full' | 'half' | 'quarter';
export type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'encoding' | 'done' | 'error' | 'cancelled';

export interface ExportSettings {
  format: ExportFormat;
  resolution: ExportResolution;
  quality: number;       // 0-1, used for webm and jpg
  startFrame: number;
  endFrame: number;
  frameRate: number;
  includeAudio: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  status: ExportStatus;
  message: string;
  errorMessage?: string;
  outputUrl?: string;  // blob URL for download when done
  outputName?: string;
}

interface ExportState {
  settings: ExportSettings;
  progress: ExportProgress;
  updateSettings: (patch: Partial<ExportSettings>) => void;
  setProgress: (patch: Partial<ExportProgress>) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: ExportSettings = {
  format: 'png-sequence',
  resolution: 'full',
  quality: 0.92,
  startFrame: 0,
  endFrame: 0,
  frameRate: 30,
  includeAudio: false,
};

const DEFAULT_PROGRESS: ExportProgress = {
  current: 0,
  total: 0,
  status: 'idle',
  message: '',
};

export const useExportStore = create<ExportState>(set => ({
  settings: { ...DEFAULT_SETTINGS },
  progress: { ...DEFAULT_PROGRESS },
  updateSettings: patch => set(s => ({ settings: { ...s.settings, ...patch } })),
  setProgress: patch => set(s => ({ progress: { ...s.progress, ...patch } })),
  reset: () => set({ progress: { ...DEFAULT_PROGRESS } }),
}));