import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'helium-high', name: 'High', category: 'voice-character',
  effects: [
    { baseType: 'pitchShift', params: {semitones: 8}, mix: 1 }
  ],
};