import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'deep-clear', name: 'Deep & Clear', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: { semitones: -3 }, mix: 1 },
    { baseType: 'highpass', params: { frequency: 100, q: 0.7 }, mix: 1 },
    { baseType: 'compressor', params: { threshold: -18, ratio: 3, attack: 0.005, release: 0.15, makeup: 3 }, mix: 1 },
  ],
};
