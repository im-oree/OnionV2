import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'night-club', name: 'Night Club', category: 'voice-filter',
  effects: [
    { baseType: 'reverb', params: {decay: 3, roomSize: 0.7}, mix: 0.55 },
    { baseType: 'delay', params: {feedback: 0.4, time: 0.18}, mix: 0.35 },
    { baseType: 'lowpass', params: {frequency: 8000, q: 0.7}, mix: 1 }
  ],
};