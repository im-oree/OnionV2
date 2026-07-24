import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'reduce-noise', name: 'Reduce Noise', category: 'voice-filter',
  effects: [
    { baseType: 'reduceNoise', params: { strength: 0.8 }, mix: 1 },
  ],
};
