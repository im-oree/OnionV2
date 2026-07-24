import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'soul-journey', name: 'Soul Journey', category: 'voice-filter',
  effects: [
    { baseType: 'reverb', params: {decay: 4, roomSize: 0.7}, mix: 0.55 },
    { baseType: 'chorus', params: {rate: 0.8, depth: 0.4}, mix: 0.3 }
  ],
};