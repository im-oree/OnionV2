import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'energetic', name: 'Energetic', category: 'voice-filter',
  effects: [
    { baseType: 'compressor', params: {ratio: 5, makeup: 6, threshold: -20, release: 0.08, attack: 0.001}, mix: 1 },
    { baseType: 'distortion', params: {amount: 15, tone: 0.7}, mix: 0.25 }
  ],
};