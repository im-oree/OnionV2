export interface CompPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  fps: number;
  category: PresetCategory;
  /** Platform icon or label shown on the thumbnail */
  platform?: string;
  /** Short description shown below the label */
  description?: string;
}

export type PresetCategory = 'video' | 'social' | 'print' | 'custom';

export const PRESET_CATEGORIES: Record<PresetCategory, { label: string; icon: string }> = {
  video: { label: 'Video', icon: 'film' },
  social: { label: 'Social Media', icon: 'share' },
  print: { label: 'Print / Photo', icon: 'image' },
  custom: { label: 'Custom', icon: 'settings' },
};

export const COMPOSITION_PRESETS: CompPreset[] = [
  // ── Video ──────────────────────────────────────────────
  { id: 'hd', label: 'HD 720p', width: 1280, height: 720, fps: 30, category: 'video', description: 'Standard HD' },
  { id: 'fhd', label: 'Full HD 1080p', width: 1920, height: 1080, fps: 30, category: 'video', platform: 'YouTube', description: '1920×1080' },
  { id: '2k', label: '2K DCI', width: 2048, height: 1080, fps: 24, category: 'video', description: '2048×1080' },
  { id: '4k', label: '4K UHD', width: 3840, height: 2160, fps: 30, category: 'video', platform: 'YouTube', description: '3840×2160' },
  { id: '4k_dci', label: '4K DCI', width: 4096, height: 2160, fps: 24, category: 'video', description: '4096×2160' },
  { id: 'vertical_fhd', label: 'Vertical FHD', width: 1080, height: 1920, fps: 30, category: 'video', description: '1080×1920' },

  // ── Social Media ───────────────────────────────────────
  { id: 'ig_square', label: 'Instagram Square', width: 1080, height: 1080, fps: 30, category: 'social', platform: 'Instagram', description: '1:1 ratio' },
  { id: 'ig_portrait', label: 'Instagram Portrait', width: 1080, height: 1350, fps: 30, category: 'social', platform: 'Instagram', description: '4:5 ratio' },
  { id: 'ig_reel', label: 'Instagram Reel', width: 1080, height: 1920, fps: 30, category: 'social', platform: 'Instagram', description: '9:16 ratio' },
  { id: 'ig_story', label: 'Instagram Story', width: 1080, height: 1920, fps: 30, category: 'social', platform: 'Instagram', description: '9:16 story' },
  { id: 'fb_square', label: 'Facebook Square', width: 1080, height: 1080, fps: 30, category: 'social', platform: 'Facebook', description: '1:1 feed' },
  { id: 'fb_landscape', label: 'Facebook Landscape', width: 1200, height: 630, fps: 30, category: 'social', platform: 'Facebook', description: '1.91:1 link' },
  { id: 'fb_reel', label: 'Facebook Reel', width: 1080, height: 1920, fps: 30, category: 'social', platform: 'Facebook', description: '9:16 ratio' },
  { id: 'tiktok', label: 'TikTok', width: 1080, height: 1920, fps: 30, category: 'social', platform: 'TikTok', description: '9:16 vertical' },
  { id: 'youtube_short', label: 'YouTube Shorts', width: 1080, height: 1920, fps: 30, category: 'social', platform: 'YouTube', description: '9:16 vertical' },
  { id: 'twitter_landscape', label: 'X / Twitter', width: 1600, height: 900, fps: 30, category: 'social', platform: 'X', description: '16:9 landscape' },
  { id: 'linkedin', label: 'LinkedIn', width: 1920, height: 1080, fps: 30, category: 'social', platform: 'LinkedIn', description: '16:9 landscape' },
  { id: 'pinterest', label: 'Pinterest', width: 1000, height: 1500, fps: 30, category: 'social', platform: 'Pinterest', description: '2:3 portrait' },

  // ── Print / Photo ──────────────────────────────────────
  { id: 'photo_4x6', label: 'Photo 4×6"', width: 1200, height: 1800, fps: 30, category: 'print', description: '1200×1800px' },
  { id: 'photo_5x7', label: 'Photo 5×7"', width: 1500, height: 2100, fps: 30, category: 'print', description: '1500×2100px' },
  { id: 'photo_8x10', label: 'Photo 8×10"', width: 2400, height: 3000, fps: 30, category: 'print', description: '2400×3000px' },
  { id: 'a4_landscape', label: 'A4 Landscape', width: 3508, height: 2480, fps: 30, category: 'print', description: '300dpi landscape' },
  { id: 'a4_portrait', label: 'A4 Portrait', width: 2480, height: 3508, fps: 30, category: 'print', description: '300dpi portrait' },
];

export const FRAME_RATE_OPTIONS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60] as const;
export const MIN_COMP_SIZE = 64;
export const MAX_COMP_SIZE = 8192;
