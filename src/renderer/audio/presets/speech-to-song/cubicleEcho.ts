import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'cubicle-echo', name: 'Cubicle Echo', category: 'speech-to-song',
  effects: [
    { baseType: 'delay', params: {feedback: 0.35, time: 0.16}, mix: 0.4 },
    { baseType: 'highpass', params: {q: 0.7, frequency: 200}, mix: 1 },
    { baseType: 'reverb', params: {decay: 0.9, roomSize: 0.3}, mix: 0.35 }
  ],
};