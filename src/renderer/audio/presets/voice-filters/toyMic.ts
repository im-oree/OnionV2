import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'toy-mic', name: 'Toy Mic', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: 5}, mix: 1 },
    { baseType: 'bandpass', params: {frequency: 2500, q: 3}, mix: 1 },
    { baseType: 'distortion', params: {amount: 25, tone: 0.7}, mix: 0.4 }
  ],
};