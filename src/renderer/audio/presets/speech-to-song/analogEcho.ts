import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'analog-echo', name: 'Analog Echo', category: 'speech-to-song',
  effects: [
    { baseType: 'delay', params: {feedback: 0.55, time: 0.375}, mix: 0.55 },
    { baseType: 'lowpass', params: {q: 0.7, frequency: 4200}, mix: 1 },
    { baseType: 'chorus', params: {rate: 0.7, depth: 0.35}, mix: 0.3 },
    { baseType: 'reverb', params: {decay: 2, roomSize: 0.5}, mix: 0.3 }
  ],
};