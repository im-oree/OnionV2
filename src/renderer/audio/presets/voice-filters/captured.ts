import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'captured', name: 'Captured', category: 'voice-filter',
  effects: [
    { baseType: 'reverb', params: {decay: 5, roomSize: 0.8}, mix: 0.7 },
    { baseType: 'lowpass', params: {frequency: 3500, q: 0.7}, mix: 1 },
    { baseType: 'distortion', params: {amount: 18, tone: 0.3}, mix: 0.3 }
  ],
};