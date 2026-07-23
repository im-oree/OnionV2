import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'robo',
  name: 'R.O.B.O.',
  category: 'voice-character',
  effects: [
    { baseType: 'tremolo',    params: { rate: 15, depth: 0.7 }, mix: 1 },
    { baseType: 'bitcrusher', params: { bits: 8, normfreq: 0.6 }, mix: 1 },
  ],
};
