/**
 * ShapeRegistry — high-level facade combining preset defs + path builder.
 */
import { PATH_BUILDERS } from './ShapePathBuilder';
import { SHAPE_PRESETS, getPresetById, defaultParamsFor, type ShapePresetDef } from './presets';

export interface BuiltPath {
  d: string;
  width: number;
  height: number;
}

export function listPresets(): ShapePresetDef[] { return SHAPE_PRESETS; }

export function getPreset(id: string): ShapePresetDef | undefined { return getPresetById(id); }

export function getPresetsByCategory(): Record<string, ShapePresetDef[]> {
  const out: Record<string, ShapePresetDef[]> = {};
  for (const p of SHAPE_PRESETS) {
    (out[p.category] ??= []).push(p);
  }
  return out;
}

export function buildPath(presetId: string, width: number, height: number, params: Record<string, number>): BuiltPath | null {
  const builder = PATH_BUILDERS[presetId];
  if (!builder) return null;
  const preset = getPresetById(presetId);
  if (!preset) return null;
  const merged = { ...defaultParamsFor(preset), ...params };
  const d = builder({ width, height, params: merged });
  return { d, width, height };
}

export { defaultParamsFor };