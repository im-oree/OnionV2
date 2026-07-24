import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'monster-low', name: 'Low', category: 'voice-character',
  effects: [
    { baseType: 'pitchShift', params: {semitones: -10}, mix: 1 },
    { baseType: 'distortion', params: {tone: 0.3, amount: 12}, mix: 0.35 }
  ],
};