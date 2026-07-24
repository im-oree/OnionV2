import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'sound-sharpener', name: 'Sound Sharpener', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 150, q: 1}, mix: 1 },
    { baseType: 'distortion', params: {amount: 10, tone: 0.8}, mix: 0.3 },
    { baseType: 'compressor', params: {ratio: 4, makeup: 4, threshold: -20, release: 0.05, attack: 0.001}, mix: 1 }
  ],
};