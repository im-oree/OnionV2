import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'bawk-talk', name: 'Bawk Talk', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: 7}, mix: 1 },
    { baseType: 'tremolo', params: {rate: 6, depth: 0.5}, mix: 1 },
    { baseType: 'bandpass', params: {frequency: 2000, q: 2}, mix: 1 }
  ],
};