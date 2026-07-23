import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'space-intercom',
  name: 'Space Intercom',
  category: 'voice-character',
  effects: [
    { baseType: 'phaser', params: { rate: 0.3, depth: 0.8 }, mix: 0.7 },
    { baseType: 'delay',  params: { time: 0.08, feedback: 0.3 }, mix: 0.4 },
  ],
};
