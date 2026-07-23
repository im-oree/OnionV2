/**
 * Shared preset types + auto-registration.
 * Individual preset files export a `preset` constant that gets picked up
 * automatically by presets/index.ts via import.meta.glob.
 */
import type { AudioEffectType } from '../../../types/layer';

export type PresetCategory = 'voice-filter' | 'voice-character' | 'speech-to-song';

export interface AudioPreset {
  id: string;
  name: string;
  category: PresetCategory;
  /**
   * A preset can be a single effect OR a chain of multiple effects.
   * When user applies the preset, ALL these effects are added to the layer.
   */
  effects: Array<{
    baseType: AudioEffectType;
    params: Record<string, number>;
    mix: number;
  }>;
}