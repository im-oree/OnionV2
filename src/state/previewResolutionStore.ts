/**
 * previewResolutionStore â€” controls the render resolution of the viewport.
 *
 * Full   = 1.0   (native)
 * Half   = 0.5   (1/2)
 * Third  = 0.333 (1/3)
 * Quarter= 0.25  (1/4)
 *
 * "Auto" = full when idle, drops to configured playbackScale during
 * playback/scrubbing, restores on pause.
 */
import { create } from 'zustand';

export type PreviewScale = 1 | 0.5 | 0.333 | 0.25;

export interface PreviewResolutionState {
  /** Current effective scale factor applied to the WebGL canvas. */
  scale: PreviewScale;
  /** Scale to auto-drop to during playback/scrubbing. */
  playbackScale: PreviewScale;
  /** If true, auto-drop scale during playback. */
  autoDropOnPlayback: boolean;
  /** True while playback/scrubbing is active. */
  isPlaybackActive: boolean;

  setScale: (s: PreviewScale) => void;
  setPlaybackScale: (s: PreviewScale) => void;
  setAutoDropOnPlayback: (v: boolean) => void;
  setPlaybackActive: (v: boolean) => void;
  /** Effective render scale considering auto-drop policy. */
  getEffectiveScale: () => PreviewScale;
}

export const usePreviewResolutionStore = create<PreviewResolutionState>((set, get) => ({
  scale: 1,
  playbackScale: 0.5,
  autoDropOnPlayback: true,
  isPlaybackActive: false,

  setScale: (s) => set({ scale: s }),
  setPlaybackScale: (s) => set({ playbackScale: s }),
  setAutoDropOnPlayback: (v) => set({ autoDropOnPlayback: v }),
  setPlaybackActive: (v) => set({ isPlaybackActive: v }),

  getEffectiveScale: () => {
    const s = get();
    if (s.autoDropOnPlayback && s.isPlaybackActive) {
      // Combine: if user is at 1.0 and playback drops to 0.5, use 0.5.
      // If user already at 0.25, keep 0.25.
      return Math.min(s.scale, s.playbackScale) as PreviewScale;
    }
    return s.scale;
  },
}));

export const PREVIEW_SCALE_LABELS: Record<PreviewScale, string> = {
  1: 'Full',
  0.5: '1/2',
  0.333: '1/3',
  0.25: '1/4',
};