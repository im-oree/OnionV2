import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'crisp-mic', name: 'Crisp Mic', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 120, q: 0.7}, mix: 1 },
    { baseType: 'compressor', params: {ratio: 3, makeup: 4, threshold: -22, release: 0.1, attack: 0.003}, mix: 1 }
  ],
};