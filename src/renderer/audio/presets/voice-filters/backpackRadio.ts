import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'backpack-radio', name: 'Backpack Radio', category: 'voice-filter',
  effects: [
    { baseType: 'bandpass', params: {frequency: 1800, q: 2}, mix: 1 },
    { baseType: 'distortion', params: {amount: 15, tone: 0.5}, mix: 0.4 },
    { baseType: 'compressor', params: {ratio: 5, makeup: 5, threshold: -22, release: 0.1, attack: 0.002}, mix: 1 }
  ],
};