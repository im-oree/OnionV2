/**
 * Export system types & presets.
 * Shared across ExportEngine, encoders, and UI dialogs.
 */

// ── Formats ──────────────────────────────────────────────────────────

export type ExportFormat =
  // Video
  | 'mp4-h264'
  | 'mp4-h265'
  | 'webm-vp9'
  | 'webm-vp8'
  | 'gif'
  // Sequences
  | 'png-sequence'
  | 'jpg-sequence'
  // Single frame
  | 'frame-png'
  | 'frame-jpg'
  | 'frame-webp'
  // Audio only
  | 'audio-wav'
  | 'audio-mp3'
  | 'audio-aac'
  | 'audio-opus';

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  'mp4-h264': 'MP4 (H.264)',
  'mp4-h265': 'MP4 (H.265 / HEVC)',
  'webm-vp9': 'WebM (VP9)',
  'webm-vp8': 'WebM (VP8)',
  'gif': 'GIF (Animated)',
  'png-sequence': 'PNG Sequence',
  'jpg-sequence': 'JPG Sequence',
  'frame-png': 'Single Frame (PNG)',
  'frame-jpg': 'Single Frame (JPG)',
  'frame-webp': 'Single Frame (WebP)',
  'audio-wav': 'Audio Only (WAV)',
  'audio-mp3': 'Audio Only (MP3)',
  'audio-aac': 'Audio Only (AAC)',
  'audio-opus': 'Audio Only (Opus)',
};

export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  'mp4-h264': 'mp4',
  'mp4-h265': 'mp4',
  'webm-vp9': 'webm',
  'webm-vp8': 'webm',
  'gif': 'gif',
  'png-sequence': 'zip',
  'jpg-sequence': 'zip',
  'frame-png': 'png',
  'frame-jpg': 'jpg',
  'frame-webp': 'webp',
  'audio-wav': 'wav',
  'audio-mp3': 'mp3',
  'audio-aac': 'aac',
  'audio-opus': 'opus',
};

export type FormatCategory = 'video' | 'sequence' | 'frame' | 'audio';

export function formatCategory(f: ExportFormat): FormatCategory {
  if (f.startsWith('audio-')) return 'audio';
  if (f.startsWith('frame-')) return 'frame';
  if (f.endsWith('-sequence')) return 'sequence';
  return 'video';
}

export function formatSupportsAudio(f: ExportFormat): boolean {
  return f === 'mp4-h264' || f === 'mp4-h265' || f === 'webm-vp9' || f === 'webm-vp8';
}

export function formatSupportsAlpha(f: ExportFormat): boolean {
  return (
    f === 'png-sequence' ||
    f === 'frame-png' ||
    f === 'frame-webp' ||
    f === 'webm-vp9' ||
    f === 'webm-vp8'
  );
}

// ── Resolution presets ───────────────────────────────────────────────

export interface ResolutionPreset {
  id: string;
  label: string;
  width?: number;   // absolute
  height?: number;
  scale?: number;   // relative to comp (1 = full, 0.5 = half)
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: 'comp',    label: 'Comp Size',        scale: 1 },
  { id: 'half',    label: 'Half',             scale: 0.5 },
  { id: 'third',   label: 'Third',            scale: 1 / 3 },
  { id: 'quarter', label: 'Quarter',          scale: 0.25 },
  { id: '4k',      label: '4K UHD (3840x2160)',   width: 3840, height: 2160 },
  { id: '2k',      label: '2K QHD (2560x1440)',   width: 2560, height: 1440 },
  { id: '1080p',   label: 'Full HD (1920x1080)',  width: 1920, height: 1080 },
  { id: '720p',    label: 'HD (1280x720)',         width: 1280, height: 720 },
  { id: '480p',    label: 'SD (854x480)',          width: 854, height: 480 },
  { id: '360p',    label: '360p (640x360)',        width: 640, height: 360 },
  { id: 'vertical-1080', label: 'Vertical 1080x1920', width: 1080, height: 1920 },
  { id: 'square-1080',   label: 'Square 1080x1080', width: 1080, height: 1080 },
  { id: 'custom',  label: 'Custom' },
];

// ── FPS presets ──────────────────────────────────────────────────────

export interface FpsPreset { id: string; label: string; value: number | 'comp' | 'custom'; }

export const FPS_PRESETS: FpsPreset[] = [
  { id: 'comp',    label: 'Comp FPS',   value: 'comp' },
  { id: '60',      label: '60',         value: 60 },
  { id: '50',      label: '50',         value: 50 },
  { id: '30',      label: '30',         value: 30 },
  { id: '29.97',   label: '29.97 (NTSC)', value: 29.97 },
  { id: '25',      label: '25 (PAL)',   value: 25 },
  { id: '24',      label: '24 (Film)',  value: 24 },
  { id: '23.976',  label: '23.976',     value: 23.976 },
  { id: '15',      label: '15',         value: 15 },
  { id: '12',      label: '12',         value: 12 },
  { id: 'custom',  label: 'Custom',     value: 'custom' },
];

// ── Video quality presets (bitrate in bits per second) ───────────────

export interface BitratePreset { id: string; label: string; bps: number | 'custom'; }

export const BITRATE_PRESETS: BitratePreset[] = [
  { id: 'ultra',   label: 'Ultra (50 Mbps)', bps: 50_000_000 },
  { id: 'high',    label: 'High (20 Mbps)',  bps: 20_000_000 },
  { id: 'medium',  label: 'Medium (10 Mbps)', bps: 10_000_000 },
  { id: 'low',     label: 'Low (4 Mbps)',    bps: 4_000_000 },
  { id: 'draft',   label: 'Draft (1.5 Mbps)', bps: 1_500_000 },
  { id: 'custom',  label: 'Custom',          bps: 'custom' },
];

// ── Audio codecs & bitrates ──────────────────────────────────────────

export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'wav';

export const AUDIO_BITRATE_PRESETS: Record<AudioCodec, number[]> = {
  aac:  [96, 128, 192, 256, 320], // kbps
  mp3:  [96, 128, 192, 256, 320],
  opus: [64,  96, 128, 192, 256],
  wav:  [],  // lossless, no bitrate
};

export const AUDIO_SAMPLE_RATES = [22050, 44100, 48000, 96000] as const;

// ── Encoder preference ───────────────────────────────────────────────

export type EncoderPreference = 'auto' | 'webcodecs' | 'mediarecorder' | 'ffmpeg';

export const ENCODER_LABELS: Record<EncoderPreference, string> = {
  auto: 'Auto (Best Available)',
  webcodecs: 'WebCodecs (Hardware)',
  mediarecorder: 'MediaRecorder (Native)',
  ffmpeg: 'FFmpeg WASM (Software)',
};

// ── Priority ─────────────────────────────────────────────────────────

export type ExportPriority = 'fast' | 'balanced' | 'best';

// ── Color / range ────────────────────────────────────────────────────

export type ColorSpace = 'srgb' | 'rec709' | 'rec2020';

export interface FrameRange {
  mode: 'full' | 'workArea' | 'custom';
  startFrame: number;
  endFrame: number;
}

// ── Full settings ────────────────────────────────────────────────────

export interface ExportSettings {
  // Output
  fileName: string;
  format: ExportFormat;

  // Video
  resolutionPresetId: string;
  width: number;
  height: number;
  fpsPresetId: string;
  fps: number;
  bitratePresetId: string;
  bitrate: number;         // bps
  quality: number;         // 0-100, used for JPG / GIF
  encoder: EncoderPreference;
  colorSpace: ColorSpace;
  includeAlpha: boolean;

  // Audio
  includeAudio: boolean;
  audioCodec: AudioCodec;
  audioBitrate: number;    // kbps
  audioSampleRate: number;
  audioChannels: 1 | 2;

  // Range
  range: FrameRange;

  // Advanced
  motionBlurSamples: number;
  priority: ExportPriority;
  gifLoopCount: number;    // 0 = infinite
  metadata: {
    title?: string;
    author?: string;
    comment?: string;
  };

  // Save location
  saveLocation: 'download' | 'directory';  // download = browser download folder, directory = user-picked
  useSaveDialog: boolean;                  // show File System Access saveFilePicker
}

export function defaultExportSettings(comp?: {
  width: number;
  height: number;
  fps: number;
  duration: number;
  name: string;
}): ExportSettings {
  const w = comp?.width ?? 1920;
  const h = comp?.height ?? 1080;
  const fps = comp?.fps ?? 30;
  const totalFrames = comp ? Math.floor(comp.duration * fps) : 300;
  return {
    fileName: comp?.name?.replace(/[^\w\s-]/g, '').trim() || 'export',
    format: 'mp4-h264',
    resolutionPresetId: 'comp',
    width: w,
    height: h,
    fpsPresetId: 'comp',
    fps,
    bitratePresetId: 'high',
    bitrate: 20_000_000,
    quality: 90,
    encoder: 'auto',
    colorSpace: 'srgb',
    includeAlpha: false,
    includeAudio: true,
    audioCodec: 'aac',
    audioBitrate: 192,
    audioSampleRate: 48000,
    audioChannels: 2,
    range: {
      mode: 'full',
      startFrame: 0,
      endFrame: Math.max(0, totalFrames - 1),
    },
    motionBlurSamples: 8,
    priority: 'balanced',
    gifLoopCount: 0,
    metadata: {},
    saveLocation: 'download',
    useSaveDialog: true,
  };
}

// ── Progress ─────────────────────────────────────────────────────────

export type ExportStatus =
  | 'idle'
  | 'preparing'
  | 'rendering'
  | 'encoding'
  | 'paused'
  | 'done'
  | 'error'
  | 'cancelled';

export interface ExportProgress {
  status: ExportStatus;
  currentFrame: number;
  totalFrames: number;
  message: string;
  errorMessage?: string;

  // Timing
  startedAt: number;   // ms epoch
  elapsedMs: number;
  etaMs: number;
  avgFrameMs: number;
  lastFrameMs: number;

  // Output
  outputBlob?: Blob;
  outputUrl?: string;
  outputName?: string;
  outputSize?: number;
}

export function defaultProgress(): ExportProgress {
  return {
    status: 'idle',
    currentFrame: 0,
    totalFrames: 0,
    message: '',
    startedAt: 0,
    elapsedMs: 0,
    etaMs: 0,
    avgFrameMs: 0,
    lastFrameMs: 0,
  };
}