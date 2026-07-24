import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'underwater', name: 'Underwater', category: 'voice-filter',
  effects: [
    { baseType: 'lowpass', params: {frequency: 800, q: 0.5}, mix: 1 },
    { baseType: 'chorus', params: {rate: 0.2, depth: 0.7}, mix: 0.5 },
    { baseType: 'reverb', params: {decay: 3, roomSize: 0.6}, mix: 0.4 }
  ],
};