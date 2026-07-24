import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'mic-hog', name: 'Mic Hog', category: 'voice-filter',
  effects: [
    { baseType: 'compressor', params: {ratio: 8, makeup: 8, threshold: -30, release: 0.05, attack: 0.001}, mix: 1 },
    { baseType: 'distortion', params: {amount: 25, tone: 0.4}, mix: 0.4 },
    { baseType: 'lowpass', params: {frequency: 4000, q: 1}, mix: 1 }
  ],
};