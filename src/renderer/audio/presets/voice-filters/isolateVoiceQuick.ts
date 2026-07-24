import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'isolate-voice', name: 'Isolate Voice', category: 'voice-filter',
  effects: [
    { baseType: 'reduceNoise', params: { strength: 0.9 }, mix: 1 },
    { baseType: 'isolateVoice', params: { strength: 0.75, centerBias: 0.6 }, mix: 0.85 },
  ],
};
