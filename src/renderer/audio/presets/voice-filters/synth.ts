import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'synth', name: 'Synth', category: 'voice-filter',
  effects: [
    { baseType: 'phaser', params: {rate: 1.2, depth: 0.7}, mix: 0.6 },
    { baseType: 'chorus', params: {rate: 1.5, depth: 0.5}, mix: 0.4 },
    { baseType: 'reverb', params: {decay: 2, roomSize: 0.6}, mix: 0.35 }
  ],
};