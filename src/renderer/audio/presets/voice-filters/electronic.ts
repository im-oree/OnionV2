import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'electronic', name: 'Electronic', category: 'voice-filter',
  effects: [
    { baseType: 'bitcrusher', params: {bits: 10, normfreq: 0.7}, mix: 1 },
    { baseType: 'chorus', params: {rate: 3, depth: 0.6}, mix: 0.5 },
    { baseType: 'delay', params: {feedback: 0.2, time: 0.12}, mix: 0.3 }
  ],
};