import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'live-stage',
  name: 'Live Stage',
  category: 'voice-filter',
  effects: [
    { baseType: 'reverb',     params: { roomSize: 0.9, decay: 4 }, mix: 0.5 },
    { baseType: 'compressor', params: { threshold: -18, ratio: 3, attack: 0.005, release: 0.15, makeup: 3 }, mix: 1 },
  ],
};
