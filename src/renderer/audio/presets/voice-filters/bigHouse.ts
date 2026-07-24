import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'big-house', name: 'Big House', category: 'voice-filter',
  effects: [
    { baseType: 'reverb', params: {decay: 8, roomSize: 0.95}, mix: 0.75 },
    { baseType: 'lowpass', params: {frequency: 6000, q: 0.7}, mix: 1 }
  ],
};