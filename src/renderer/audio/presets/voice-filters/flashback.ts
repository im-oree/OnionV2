import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'flashback', name: 'Flashback', category: 'voice-filter',
  effects: [
    { baseType: 'reverb', params: {decay: 6, roomSize: 0.9}, mix: 0.75 },
    { baseType: 'delay', params: {feedback: 0.55, time: 0.4}, mix: 0.5 },
    { baseType: 'lowpass', params: {frequency: 4000, q: 0.7}, mix: 1 },
    { baseType: 'chorus', params: {rate: 0.5, depth: 0.5}, mix: 0.35 }
  ],
};