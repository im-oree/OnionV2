export interface CompPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  fps: number;
}

export const COMPOSITION_PRESETS: CompPreset[] = [
  { id: 'fhd', label: 'HD 1080p', width: 1920, height: 1080, fps: 30 },
  { id: 'hd', label: 'HD 720p', width: 1280, height: 720, fps: 30 },
  { id: '4k', label: '4K UHD', width: 3840, height: 2160, fps: 30 },
  { id: '2k', label: '2K DCI', width: 2048, height: 1080, fps: 24 },
  { id: 'square', label: 'Square 1080', width: 1080, height: 1080, fps: 30 },
  { id: 'vertical', label: 'Vertical 1080x1920', width: 1080, height: 1920, fps: 30 },
  { id: 'custom', label: 'Custom', width: 1920, height: 1080, fps: 30 },
];

export const FRAME_RATE_OPTIONS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60] as const;
export const MIN_COMP_SIZE = 64;
export const MAX_COMP_SIZE = 8192;
