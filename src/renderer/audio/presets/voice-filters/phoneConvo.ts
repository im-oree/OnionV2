import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'phone-convo', name: 'Phone Convo', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 400, q: 1}, mix: 1 },
    { baseType: 'lowpass', params: {frequency: 3400, q: 1}, mix: 1 },
    { baseType: 'compressor', params: {ratio: 5, makeup: 6, threshold: -25, release: 0.1, attack: 0.002}, mix: 1 },
    { baseType: 'distortion', params: {amount: 8, tone: 0.5}, mix: 0.2 }
  ],
};