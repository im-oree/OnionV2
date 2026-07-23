import type { AudioPreset } from '../types';
export const preset: AudioPreset = {
  id: 'echo',
  name: 'Echo',
  category: 'voice-filter',
  effects: [
    { baseType: 'delay', params: { time: 0.35, feedback: 0.5 }, mix: 0.5 },
  ],
};
