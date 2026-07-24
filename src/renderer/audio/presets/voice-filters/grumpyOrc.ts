import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'grumpy-orc', name: 'Grumpy Orc', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: -8}, mix: 1 },
    { baseType: 'distortion', params: {amount: 40, tone: 0.3}, mix: 0.7 },
    { baseType: 'lowpass', params: {frequency: 2500, q: 0.7}, mix: 1 }
  ],
};