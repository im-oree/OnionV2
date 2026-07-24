import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'echo-canyon', name: 'Echo Canyon', category: 'voice-filter',
  effects: [
    { baseType: 'delay', params: {feedback: 0.6, time: 0.5}, mix: 0.6 },
    { baseType: 'reverb', params: {decay: 7, roomSize: 0.9}, mix: 0.5 },
    { baseType: 'lowpass', params: {frequency: 5000, q: 0.7}, mix: 1 }
  ],
};