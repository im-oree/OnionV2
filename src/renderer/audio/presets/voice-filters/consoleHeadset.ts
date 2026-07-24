import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'console-headset', name: 'Console Headset', category: 'voice-filter',
  effects: [
    { baseType: 'highpass', params: {frequency: 250, q: 1}, mix: 1 },
    { baseType: 'lowpass', params: {frequency: 5500, q: 1}, mix: 1 },
    { baseType: 'compressor', params: {ratio: 4, makeup: 3, threshold: -18, release: 0.08, attack: 0.002}, mix: 1 },
    { baseType: 'bitcrusher', params: {bits: 12, normfreq: 0.6}, mix: 0.3 }
  ],
};