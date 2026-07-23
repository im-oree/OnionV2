import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'sweet',
  name: 'Sweet',
  category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: { semitones: 3 }, mix: 1 },
    { baseType: 'reverb',     params: { roomSize: 0.4, decay: 1.2 }, mix: 0.3 },
  ],
};
