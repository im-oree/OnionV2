import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'classic-fm-radio', name: 'Classic FM Radio', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 300, q: 1}, mix: 1 },
    { baseType: 'lowpass', params: {frequency: 4500, q: 1}, mix: 1 },
    { baseType: 'compressor', params: {ratio: 6, makeup: 5, threshold: -22, release: 0.1, attack: 0.001}, mix: 1 }
  ],
};