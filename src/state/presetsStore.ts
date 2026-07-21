import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EffectInstance } from '../types/effect';

export interface EffectPreset {
  id: string;
  name: string;
  effects: EffectInstance[];
  createdAt: number;
}

interface PresetsState {
  presets: EffectPreset[];
  addPreset: (name: string, effects: EffectInstance[]) => EffectPreset;
  removePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  applyPreset: (presetId: string) => EffectInstance[] | null;
}

let _id = 0;
function genId() { return `preset_${Date.now()}_${++_id}`; }

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set, get) => ({
      presets: [],

      addPreset: (name, effects) => {
        const preset: EffectPreset = {
          id: genId(), name, effects: JSON.parse(JSON.stringify(effects)),
          createdAt: Date.now(),
        };
        set(s => ({ presets: [...s.presets, preset] }));
        return preset;
      },

      removePreset: (id) => set(s => ({
        presets: s.presets.filter(p => p.id !== id),
      })),

      renamePreset: (id, name) => set(s => ({
        presets: s.presets.map(p => p.id === id ? { ...p, name } : p),
      })),

      applyPreset: (presetId) => {
        const preset = get().presets.find(p => p.id === presetId);
        if (!preset) return null;
        return JSON.parse(JSON.stringify(preset.effects));
      },
    }),
    { name: 'onionv2-effect-presets' }
  )
);
