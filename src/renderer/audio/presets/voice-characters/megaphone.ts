import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'megaphone',
  name: 'Megaphone',
  category: 'voice-character',
  effects: [
    { baseType: 'distortion', params: { amount: 40, tone: 0.4 }, mix: 1 },
    { baseType: 'bandpass',   params: { frequency: 1800, q: 2 }, mix: 1 },
  ],
};
