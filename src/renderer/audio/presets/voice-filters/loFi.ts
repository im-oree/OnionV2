import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'lo-fi',
  name: 'Lo-Fi',
  category: 'voice-filter',
  effects: [
    { baseType: 'bitcrusher', params: { bits: 6, normfreq: 0.3 }, mix: 1 },
  ],
};
