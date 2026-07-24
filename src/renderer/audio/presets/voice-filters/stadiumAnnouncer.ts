import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'stadium-announcer', name: 'Stadium Announcer', category: 'voice-filter',
  effects: [
    { baseType: 'compressor', params: {ratio: 6, makeup: 6, threshold: -20, release: 0.08, attack: 0.001}, mix: 1 },
    { baseType: 'reverb', params: {decay: 4, roomSize: 0.85}, mix: 0.55 },
    { baseType: 'delay', params: {feedback: 0.3, time: 0.35}, mix: 0.25 }
  ],
};