import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'bad-mic', name: 'Bad Mic', category: 'voice-filter',
  effects: [
    { baseType: 'bitcrusher', params: {bits: 6, normfreq: 0.4}, mix: 0.5 },
    { baseType: 'distortion', params: {amount: 25, tone: 0.5}, mix: 0.4 },
    { baseType: 'lowpass', params: {frequency: 3800, q: 0.7}, mix: 1 }
  ],
};