import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'distorted', name: 'Distorted', category: 'voice-filter',
  effects: [
    { baseType: 'distortion', params: {amount: 60, tone: 0.5}, mix: 0.75 },
    { baseType: 'lowpass', params: {frequency: 4000, q: 1}, mix: 1 }
  ],
};