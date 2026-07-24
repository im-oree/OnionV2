import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'alien-distorter', name: 'Alien Distorter', category: 'voice-filter',
  effects: [
    { baseType: 'pitchShift', params: {semitones: -6}, mix: 1 },
    { baseType: 'bitcrusher', params: {bits: 4, normfreq: 0.5}, mix: 0.7 },
    { baseType: 'phaser', params: {rate: 0.3, depth: 0.9}, mix: 0.6 },
    { baseType: 'reverb', params: {decay: 3, roomSize: 0.6}, mix: 0.3 }
  ],
};