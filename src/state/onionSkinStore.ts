import { create } from 'zustand';

export interface OnionSkinSettings {
  enabled: boolean;
  framesBefore: number;
  framesAfter: number;
  frameStep: number;      // e.g. 2 = show every other frame
  opacity: number;        // 0..1, base opacity for ghost frames
  colorBefore: string;
  colorAfter: string;
}

interface OnionSkinState {
  settings: OnionSkinSettings;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
  setFramesBefore: (n: number) => void;
  setFramesAfter: (n: number) => void;
  setFrameStep: (n: number) => void;
  setOpacity: (o: number) => void;
  setColorBefore: (c: string) => void;
  setColorAfter: (c: string) => void;
}

export const useOnionSkinStore = create<OnionSkinState>((set) => ({
  settings: {
    enabled: false,
    framesBefore: 3,
    framesAfter: 3,
    frameStep: 2,
    opacity: 0.4,
    colorBefore: '#ff6b8a',  // pink for past
    colorAfter: '#5b8fff',   // blue for future
  },
  setEnabled: (v) => set((s) => ({ settings: { ...s.settings, enabled: v } })),
  toggle: () => set((s) => ({ settings: { ...s.settings, enabled: !s.settings.enabled } })),
  setFramesBefore: (n) => set((s) => ({ settings: { ...s.settings, framesBefore: Math.max(0, Math.min(20, n)) } })),
  setFramesAfter: (n) => set((s) => ({ settings: { ...s.settings, framesAfter: Math.max(0, Math.min(20, n)) } })),
  setFrameStep: (n) => set((s) => ({ settings: { ...s.settings, frameStep: Math.max(1, Math.min(10, n)) } })),
  setOpacity: (o) => set((s) => ({ settings: { ...s.settings, opacity: Math.max(0, Math.min(1, o)) } })),
  setColorBefore: (c) => set((s) => ({ settings: { ...s.settings, colorBefore: c } })),
  setColorAfter: (c) => set((s) => ({ settings: { ...s.settings, colorAfter: c } })),
}));