import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'practice-room', name: 'Practice Room', category: 'voice-filter',
  effects: [
    { baseType: 'reverb', params: {decay: 1.2, roomSize: 0.4}, mix: 0.4 },
    { baseType: 'highpass', params: {frequency: 150, q: 0.7}, mix: 1 }
  ],
};