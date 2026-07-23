import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'chipmunk',
  name: 'Chipmunk',
  category: 'voice-character',
  effects: [
    { baseType: 'pitchShift', params: { semitones: 7 }, mix: 1 },
  ],
};
