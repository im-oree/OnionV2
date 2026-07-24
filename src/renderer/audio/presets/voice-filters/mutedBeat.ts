import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'muted-beat', name: 'Muted Beat', category: 'voice-filter',
  effects: [
    { baseType: 'lowpass', params: {frequency: 1500, q: 0.5}, mix: 1 },
    { baseType: 'compressor', params: {ratio: 4, makeup: 4, threshold: -25, release: 0.2, attack: 0.005}, mix: 1 }
  ],
};