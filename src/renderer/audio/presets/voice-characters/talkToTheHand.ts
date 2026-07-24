import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'talk-to-the-hand', name: 'Talk to the Hand', category: 'voice-character',
  effects: [
    { baseType: 'lowpass', params: {q: 0.7, frequency: 1200}, mix: 1 },
    { baseType: 'distortion', params: {tone: 0.3, amount: 15}, mix: 0.4 }
  ],
};