import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'divine-echo', name: 'Divine Echo', category: 'speech-to-song',
  effects: [
    { baseType: 'reverb', params: {decay: 10, roomSize: 1}, mix: 0.8 },
    { baseType: 'delay', params: {feedback: 0.5, time: 0.5}, mix: 0.45 },
    { baseType: 'chorus', params: {rate: 0.4, depth: 0.6}, mix: 0.4 },
    { baseType: 'pitchShift', params: {semitones: 7}, mix: 0.3 }
  ],
};