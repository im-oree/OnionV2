/**
 * presetsStore — manages effect presets with save/load functionality.
 * Provides 10 built-in starter presets and supports user-created ones.
 */
import { create } from 'zustand';
import type { EffectType, EffectParameter } from '../types/effect';

export interface EffectPreset {
  id: string;
  name: string;
  effectType: EffectType;
  /** The parameter values to apply (id → value map) */
  parameters: Record<string, any>;
  /** Whether this is a built-in preset (cannot be deleted) */
  builtIn: boolean;
}

export interface PresetsState {
  presets: EffectPreset[];
  addPreset: (name: string, effectType: EffectType, parameters: Record<string, any>) => void;
  removePreset: (id: string) => void;
  getPresetsByType: (effectType: EffectType) => EffectPreset[];
}

function genId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 10 built-in presets */
const BUILT_IN_PRESETS: EffectPreset[] = [
  {
    id: 'preset_glow_soft', name: 'Soft Glow', effectType: 'glow', builtIn: true,
    parameters: { threshold: 0.6, radius: 15, intensity: 0.8, color: '#ffffff' },
  },
  {
    id: 'preset_glow_intense', name: 'Intense Glow', effectType: 'glow', builtIn: true,
    parameters: { threshold: 0.3, radius: 30, intensity: 2.5, color: '#ffffaa' },
  },
  {
    id: 'preset_shadow_hard', name: 'Hard Shadow', effectType: 'dropShadow', builtIn: true,
    parameters: { color: '#000000', opacity: 80, distance: 5, softness: 2 },
  },
  {
    id: 'preset_shadow_soft', name: 'Soft Shadow', effectType: 'dropShadow', builtIn: true,
    parameters: { color: '#000000', opacity: 40, distance: 15, softness: 20 },
  },
  {
    id: 'preset_color_warm', name: 'Warm Grade', effectType: 'colorCorrection', builtIn: true,
    parameters: { brightness: 5, contrast: 10, saturation: 15, hue: 15, gamma: 1.1 },
  },
  {
    id: 'preset_color_cool', name: 'Cool Grade', effectType: 'colorCorrection', builtIn: true,
    parameters: { brightness: 0, contrast: 5, saturation: -10, hue: -20, gamma: 0.95 },
  },
  {
    id: 'preset_color_vintage', name: 'Vintage', effectType: 'colorCorrection', builtIn: true,
    parameters: { brightness: -5, contrast: 20, saturation: -30, hue: 10, gamma: 1.2 },
  },
  {
    id: 'preset_blur_fast', name: 'Fast Motion Blur', effectType: 'directionalBlur', builtIn: true,
    parameters: { angle: 0, distance: 30 },
  },
  {
    id: 'preset_blur_dreamy', name: 'Dreamy Blur', effectType: 'gaussianBlur', builtIn: true,
    parameters: { radius: 25, quality: 'high' },
  },
  {
    id: 'preset_fill_white', name: 'White Fill 50%', effectType: 'fill', builtIn: true,
    parameters: { fillColor: '#ffffff', opacity: 50 },
  },
];

export const usePresetsStore = create<PresetsState>((set, get) => ({
  presets: [...BUILT_IN_PRESETS],

  addPreset: (name, effectType, parameters) => {
    set((s) => ({
      presets: [...s.presets, { id: genId(), name, effectType, parameters, builtIn: false }],
    }));
  },

  removePreset: (id) => {
    set((s) => ({
      presets: s.presets.filter((p) => p.id !== id || p.builtIn),
    }));
  },

  getPresetsByType: (effectType) =>
    get().presets.filter((p) => p.effectType === effectType),
}));
