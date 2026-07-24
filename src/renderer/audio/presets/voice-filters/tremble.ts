import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'tremble', name: 'Tremble', category: 'voice-filter',
  effects: [
    { baseType: 'tremolo', params: {rate: 8, depth: 0.8}, mix: 1 }
  ],
};