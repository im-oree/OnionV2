import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'android-og', name: 'Android OG', category: 'voice-character',
  effects: [
    { baseType: 'bitcrusher', params: {bits: 6, normfreq: 0.5}, mix: 0.7 },
    { baseType: 'chorus', params: {rate: 4, depth: 0.6}, mix: 0.5 },
    { baseType: 'lowpass', params: {q: 1, frequency: 4000}, mix: 1 }
  ],
};