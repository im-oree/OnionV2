/**
 * Auto-discovers all preset files under presets/*.ts (except types.ts and index.ts).
 * Adding a new preset = create a file, it's registered automatically.
 */
import type { AudioPreset, PresetCategory } from './types';

// Vite import.meta.glob eagerly imports all preset files
const modules = import.meta.glob<{ preset: AudioPreset }>(
  './*/*.ts',
  { eager: true },
);

const registry: AudioPreset[] = [];
for (const [path, mod] of Object.entries(modules)) {
  if (mod?.preset) {
    registry.push(mod.preset);
  } else {
    console.warn(`[AudioPresets] File missing 'preset' export: ${path}`);
  }
}

// Sort within categories for stable ordering
registry.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

export const AUDIO_PRESETS: readonly AudioPreset[] = registry;

export function getPreset(id: string): AudioPreset | undefined {
  return AUDIO_PRESETS.find(p => p.id === id);
}

export function getPresetsByCategory(category: PresetCategory): AudioPreset[] {
  return AUDIO_PRESETS.filter(p => p.category === category);
}

export type { AudioPreset, PresetCategory } from './types';
