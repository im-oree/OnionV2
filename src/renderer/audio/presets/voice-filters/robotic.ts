import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'robotic', name: 'Robotic', category: 'voice-filter',
  effects: [
    { baseType: 'bitcrusher', params: {bits: 6, normfreq: 0.5}, mix: 0.8 },
    { baseType: 'chorus', params: {rate: 5, depth: 0.7}, mix: 0.6 },
    { baseType: 'tremolo', params: {rate: 20, depth: 0.5}, mix: 1 }
  ],
};