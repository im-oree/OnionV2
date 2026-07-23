import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'old-phone',
  name: 'Old Phone',
  category: 'voice-filter',
  effects: [
    { baseType: 'bandpass',   params: { frequency: 1500, q: 3 }, mix: 1 },
    { baseType: 'distortion', params: { amount: 15, tone: 0.3 }, mix: 0.7 },
  ],
};
