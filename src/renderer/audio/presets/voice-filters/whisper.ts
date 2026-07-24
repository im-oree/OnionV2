import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'whisper', name: 'Whisper', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 500, q: 1.5}, mix: 1 },
    { baseType: 'lowpass', params: {frequency: 3000, q: 1}, mix: 1 },
    { baseType: 'compressor', params: {ratio: 10, makeup: 10, threshold: -30, release: 0.25, attack: 0.01}, mix: 1 }
  ],
};