import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'low-battery', name: 'Low Battery', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: -4}, mix: 1 },
    { baseType: 'bitcrusher', params: {bits: 5, normfreq: 0.3}, mix: 0.8 },
    { baseType: 'tremolo', params: {rate: 3, depth: 0.4}, mix: 1 }
  ],
};