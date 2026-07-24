import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'husky-backup', name: 'Husky Backup', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: -2}, mix: 1 },
    { baseType: 'distortion', params: {amount: 20, tone: 0.3}, mix: 0.5 },
    { baseType: 'lowpass', params: {frequency: 3000, q: 0.7}, mix: 1 }
  ],
};