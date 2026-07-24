import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'villager-sim', name: 'Villager Sim', category: 'voice-character',
  effects: [
    { baseType: 'pitchShift', params: {semitones: 4}, mix: 1 },
    { baseType: 'tremolo', params: {rate: 10, depth: 0.7}, mix: 1 },
    { baseType: 'bandpass', params: {q: 2, frequency: 1800}, mix: 1 }
  ],
};