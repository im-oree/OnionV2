import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'drone-speaker', name: 'Drone Speaker', category: 'voice-character',
  effects: [
    { baseType: 'lowpass', params: {q: 0.7, frequency: 2500}, mix: 1 },
    { baseType: 'phaser', params: {rate: 0.2, depth: 0.6}, mix: 0.5 },
    { baseType: 'tremolo', params: {rate: 12, depth: 0.3}, mix: 1 }
  ],
};