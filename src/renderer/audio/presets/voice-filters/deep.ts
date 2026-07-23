import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'deep',
  name: 'Deep',
  category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: { semitones: -5 }, mix: 1 },
    { baseType: 'lowpass',    params: { frequency: 4000, q: 0.7 }, mix: 1 },
  ],
};
