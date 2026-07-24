import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: '9d-soundscape', name: '9D Soundscape', category: 'speech-to-song',
  effects: [
    { baseType: 'stereoWiden', params: {width: 1.6}, mix: 1 },
    { baseType: 'reverb', params: {decay: 4, roomSize: 0.75}, mix: 0.5 },
    { baseType: 'phaser', params: {rate: 0.15, depth: 0.7}, mix: 0.4 },
    { baseType: 'delay', params: {feedback: 0.3, time: 0.28}, mix: 0.25 }
  ],
};