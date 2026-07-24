import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'birthday-party', name: 'Birthday Party', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: 4}, mix: 1 },
    { baseType: 'reverb', params: {decay: 1.5, roomSize: 0.5}, mix: 0.3 },
    { baseType: 'chorus', params: {rate: 2, depth: 0.5}, mix: 0.4 }
  ],
};