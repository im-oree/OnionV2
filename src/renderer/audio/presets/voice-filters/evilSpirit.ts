import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'evil-spirit', name: 'Evil Spirit', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: -5}, mix: 1 },
    { baseType: 'reverb', params: {decay: 6, roomSize: 0.9}, mix: 0.6 },
    { baseType: 'chorus', params: {rate: 0.3, depth: 0.8}, mix: 0.5 },
    { baseType: 'distortion', params: {amount: 20, tone: 0.2}, mix: 0.35 }
  ],
};