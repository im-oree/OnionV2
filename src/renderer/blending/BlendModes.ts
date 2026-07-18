/**
 * BlendModes — all compositing blend modes matching After Effects.
 * Each mode has a GLSL function snippet for the compositing shader.
 * Registered in one place — add new modes by adding to BLEND_MODES.
 */

export type BlendModeType =
  | 'normal' | 'dissolve'
  | 'darken' | 'multiply' | 'colorBurn' | 'linearBurn' | 'darkerColor'
  | 'add' | 'lighten' | 'screen' | 'colorDodge' | 'linearDodge' | 'lighterColor'
  | 'overlay' | 'softLight' | 'hardLight' | 'linearLight' | 'vividLight' | 'pinLight' | 'hardMix'
  | 'difference' | 'exclusion' | 'subtract' | 'divide'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

export type BlendCategory = 'normal' | 'darken' | 'lighten' | 'overlay' | 'difference' | 'color' | 'utility';

export interface BlendModeDef {
  id: BlendModeType;
  label: string;
  category: BlendCategory;
  abbreviation: string;
}

export const BLEND_MODES: BlendModeDef[] = [
  // Normal
  { id: 'normal', label: 'Normal', category: 'normal', abbreviation: 'N' },
  // Darken
  { id: 'darken', label: 'Darken', category: 'darken', abbreviation: 'Dk' },
  { id: 'multiply', label: 'Multiply', category: 'darken', abbreviation: 'Mu' },
  { id: 'colorBurn', label: 'Color Burn', category: 'darken', abbreviation: 'Cb' },
  { id: 'linearBurn', label: 'Linear Burn', category: 'darken', abbreviation: 'Lb' },
  { id: 'darkerColor', label: 'Darker Color', category: 'darken', abbreviation: 'Dc' },
  // Lighten
  { id: 'add', label: 'Add', category: 'lighten', abbreviation: 'Ad' },
  { id: 'lighten', label: 'Lighten', category: 'lighten', abbreviation: 'Lt' },
  { id: 'screen', label: 'Screen', category: 'lighten', abbreviation: 'Sc' },
  { id: 'colorDodge', label: 'Color Dodge', category: 'lighten', abbreviation: 'Cd' },
  { id: 'linearDodge', label: 'Linear Dodge', category: 'lighten', abbreviation: 'Ld' },
  { id: 'lighterColor', label: 'Lighter Color', category: 'lighten', abbreviation: 'Lc' },
  // Overlay
  { id: 'overlay', label: 'Overlay', category: 'overlay', abbreviation: 'Ov' },
  { id: 'softLight', label: 'Soft Light', category: 'overlay', abbreviation: 'Sl' },
  { id: 'hardLight', label: 'Hard Light', category: 'overlay', abbreviation: 'Hl' },
  { id: 'linearLight', label: 'Linear Light', category: 'overlay', abbreviation: 'Ll' },
  { id: 'vividLight', label: 'Vivid Light', category: 'overlay', abbreviation: 'Vl' },
  { id: 'pinLight', label: 'Pin Light', category: 'overlay', abbreviation: 'Pl' },
  { id: 'hardMix', label: 'Hard Mix', category: 'overlay', abbreviation: 'Hm' },
  // Difference
  { id: 'difference', label: 'Difference', category: 'difference', abbreviation: 'Df' },
  { id: 'exclusion', label: 'Exclusion', category: 'difference', abbreviation: 'Ex' },
  { id: 'subtract', label: 'Subtract', category: 'difference', abbreviation: 'Su' },
  { id: 'divide', label: 'Divide', category: 'difference', abbreviation: 'Dv' },
  // Color
  { id: 'hue', label: 'Hue', category: 'color', abbreviation: 'Hu' },
  { id: 'saturation', label: 'Saturation', category: 'color', abbreviation: 'Sa' },
  { id: 'color', label: 'Color', category: 'color', abbreviation: 'Co' },
  { id: 'luminosity', label: 'Luminosity', category: 'color', abbreviation: 'Lu' },
];

// Category display order for UI dropdowns
export const BLEND_CATEGORIES: BlendCategory[] = [
  'normal', 'darken', 'lighten', 'overlay', 'difference', 'color',
];

/** GLSL function that composites base and over layers using blend mode enum */
export function buildBlendShader(): string {
  return `vec3 blendNormal(vec3 b, vec3 o) { return o; }
vec3 blendDarken(vec3 b, vec3 o) { return min(b, o); }
vec3 blendMultiply(vec3 b, vec3 o) { return b * o; }
vec3 blendColorBurn(vec3 b, vec3 o) { vec3 r = 1.0 - ((1.0 - b) / max(o, 0.001)); return clamp(r, 0.0, 1.0); }
vec3 blendLinearBurn(vec3 b, vec3 o) { return max(b + o - 1.0, 0.0); }
vec3 blendAdd(vec3 b, vec3 o) { return min(b + o, 1.0); }
vec3 blendLighten(vec3 b, vec3 o) { return max(b, o); }
vec3 blendScreen(vec3 b, vec3 o) { return 1.0 - (1.0 - b) * (1.0 - o); }
vec3 blendColorDodge(vec3 b, vec3 o) { vec3 r = b / max(1.0 - o, 0.001); return clamp(r, 0.0, 1.0); }
vec3 blendLinearDodge(vec3 b, vec3 o) { return min(b + o, 1.0); }
vec3 blendOverlay(vec3 b, vec3 o) { return mix(2.0 * b * o, 1.0 - 2.0 * (1.0 - b) * (1.0 - o), step(0.5, b)); }
vec3 blendSoftLight(vec3 b, vec3 o) { return (1.0 - 2.0 * o) * b * b + 2.0 * o * b; }
vec3 blendHardLight(vec3 b, vec3 o) { return blendOverlay(o, b); }
vec3 blendDifference(vec3 b, vec3 o) { return abs(b - o); }
vec3 blendExclusion(vec3 b, vec3 o) { return b + o - 2.0 * b * o; }
vec3 blendSubtract(vec3 b, vec3 o) { return max(b - o, 0.0); }
vec3 blendDivide(vec3 b, vec3 o) { return min(b / max(o, 0.001), 1.0); }

vec3 composite(vec3 base, vec3 over, float overAlpha, int mode) {
  if (mode == 0) return blendNormal(base, over);
  if (mode == 1) return blendDarken(base, over);
  if (mode == 2) return blendMultiply(base, over);
  if (mode == 3) return blendColorBurn(base, over);
  if (mode == 4) return blendLinearBurn(base, over);
  if (mode == 5) return blendAdd(base, over);
  if (mode == 6) return blendLighten(base, over);
  if (mode == 7) return blendScreen(base, over);
  if (mode == 8) return blendColorDodge(base, over);
  if (mode == 9) return blendLinearDodge(base, over);
  if (mode == 10) return blendOverlay(base, over);
  if (mode == 11) return blendSoftLight(base, over);
  if (mode == 12) return blendHardLight(base, over);
  if (mode == 13) return blendDifference(base, over);
  if (mode == 14) return blendExclusion(base, over);
  if (mode == 15) return blendSubtract(base, over);
  if (mode == 16) return blendDivide(base, over);
  return blendNormal(base, over);
}`;
}

/** Map blend mode id to numeric index for shader uniform */
export function blendModeIndex(id: BlendModeType): number {
  const idx = BLEND_MODES.findIndex((b) => b.id === id);
  return idx >= 0 ? idx : 0;
}
