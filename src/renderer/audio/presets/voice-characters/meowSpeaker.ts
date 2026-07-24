import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'meow-speaker', name: 'Meow Speaker', category: 'voice-character',
  effects: [
    { baseType: 'pitchShift', params: {semitones: 6}, mix: 1 },
    { baseType: 'phaser', params: {rate: 3, depth: 0.5}, mix: 0.4 },
    { baseType: 'bandpass', params: {q: 2, frequency: 1600}, mix: 1 }
  ],
};