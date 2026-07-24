import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'vinyl', name: 'Vinyl', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 200, q: 0.7}, mix: 1 },
    { baseType: 'lowpass', params: {frequency: 5500, q: 0.8}, mix: 1 },
    { baseType: 'distortion', params: {amount: 12, tone: 0.4}, mix: 0.3 },
    { baseType: 'tremolo', params: {rate: 0.6, depth: 0.1}, mix: 1 }
  ],
};