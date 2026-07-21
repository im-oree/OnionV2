/**
 * blendMode — effect that composites the layer over a configurable background
 * using the selected blending formula. When applied, it also sets the layer's
 * blendMode property so the compositor handles cross-layer blending.
 *
 * The select parameter uses NUMERIC values (0-26) matching BLEND_MODES array
 * indices. The fragment shader routes each index to the correct blend function.
 * In effectsStore, the numeric value is mapped back to the string ID for layer.blendMode.
 */
import type { EffectModule } from './types';
import { def, param } from './types';
import { BLEND_MODES } from '../../blending/BlendModes';

/** Full descriptions for each blend mode, organized by group. Export for UI tooltips. */
export const BLEND_DESCRIPTIONS: Record<string, string> = {
  normal:    'Normal: Default state; the top layer simply overrides the bottom layer based on its opacity settings.',
  dissolve:  'Dissolve: Randomly replaces pixels with the top or bottom layer, creating a scattered, grainy effect.',
  darken:    'Darken: Keeps the darker pixel from either layer. Great for removing white backgrounds.',
  multiply:  'Multiply: Multiplies colors. Creates a darker image. Pure white on top becomes transparent.',
  colorBurn: 'Color Burn: Darkens base color to reflect blend color, increasing contrast in dark areas.',
  linearBurn: 'Linear Burn: Darkens base by decreasing brightness. Stronger shadows than Color Burn.',
  darkerColor: 'Darker Color: Compares all channels and chooses the darkest overall pixel.',
  add:       'Add: Combines brightness values. Intense, bright highlights.',
  lighten:   'Lighten: Selects the lighter pixel. Perfect for removing black backgrounds.',
  screen:    'Screen: Opposite of Multiply. Pure black becomes transparent. Ideal for glowing effects.',
  colorDodge: 'Color Dodge: Brightens base by decreasing contrast. Vibrant mid-tones.',
  linearDodge: 'Linear Dodge (Add): Brightens base by increasing brightness. Intense highlights.',
  lighterColor: 'Lighter Color: Examines all channels, selects the brightest overall pixel.',
  overlay:   'Overlay: Combines Multiply and Screen. Mid-gray becomes transparent.',
  softLight: 'Soft Light: Gentler Overlay. Acts like a diffused spotlight.',
  hardLight: 'Hard Light: Stronger Overlay. Acts like a hard spotlight.',
  linearLight: 'Linear Light: Burns or dodges by decreasing or increasing brightness based on top color.',
  vividLight: 'Vivid Light: Dramatically increases/decreases contrast. Hyper-saturated looks.',
  pinLight:  'Pin Light: Replaces colors dramatically. Leaves mid-tones heavily saturated.',
  hardMix:   'Hard Mix: Crushes colors into primary hues (RGB, CMYK, White, Black).',
  difference: 'Difference: Subtracts brightness. Inverts colors. Used to align clips.',
  exclusion: 'Exclusion: Softer Difference. Lower-contrast result.',
  subtract:  'Subtract: Darkens image by inverting top colors and blending.',
  divide:    'Divide: Brightens base by dividing base by blend layer values.',
  hue:       'Hue: Applies hue of top layer, retains luminosity and saturation of bottom.',
  saturation: 'Saturation: Applies saturation (intensity) of top, keeps hue and luminosity of bottom.',
  color:     'Color: Combines hue and saturation of top with luminosity of bottom.',
  luminosity: 'Luminosity: Applies brightness of top layer to hue and saturation of bottom.',
};

const fullDescription = `Sets the layer's composite blend mode. TIP: You can also change blend mode directly on the layer using the layer's blend mode dropdown in the Outliner.`;

/**
 * Build a unified fragment shader that handles all 27 blend modes.
 * Each mode uses its BLEND_MODES array index (0-26) as the numeric value.
 *
 * Standard composite modes (indices 0-4, 6-10, 12-14, 19-22) use the blend
 * functions from buildBlendShader(). Custom modes (5, 11, 15-18, 23-26) have
 * dedicated GLSL. Dissolve (index - unused here, handled by separate mode)
 * and component/HCL modes (23-26) have simplified implementations.
 */
function buildFragmentShader(): string {
  return `
// ── Standard blend functions ────────────────────────────────
vec3 blendNormal(vec3 b, vec3 o) { return o; }
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

// ── Custom modes not in standard set ─────────────────────────
vec3 blendDarkerColor(vec3 b, vec3 o) {
  float bLum = dot(b, vec3(0.2126, 0.7152, 0.0722));
  float oLum = dot(o, vec3(0.2126, 0.7152, 0.0722));
  return oLum < bLum ? o : b;
}
vec3 blendLighterColor(vec3 b, vec3 o) {
  float bLum = dot(b, vec3(0.2126, 0.7152, 0.0722));
  float oLum = dot(o, vec3(0.2126, 0.7152, 0.0722));
  return oLum > bLum ? o : b;
}
vec3 blendLinearLight(vec3 b, vec3 o) { return clamp(b + 2.0 * o - 1.0, 0.0, 1.0); }
vec3 blendVividLight(vec3 b, vec3 o) {
  vec3 r;
  r.r = o.r < 0.5 ? 1.0 - (1.0 - b.r) / max(2.0 * o.r, 0.001) : b.r / max(2.0 * (1.0 - o.r), 0.001);
  r.g = o.g < 0.5 ? 1.0 - (1.0 - b.g) / max(2.0 * o.g, 0.001) : b.g / max(2.0 * (1.0 - o.g), 0.001);
  r.b = o.b < 0.5 ? 1.0 - (1.0 - b.b) / max(2.0 * o.b, 0.001) : b.b / max(2.0 * (1.0 - o.b), 0.001);
  return clamp(r, 0.0, 1.0);
}
vec3 blendPinLight(vec3 b, vec3 o) {
  vec3 r;
  r.r = o.r < 0.5 ? min(b.r, 2.0 * o.r) : max(b.r, 2.0 * o.r - 1.0);
  r.g = o.g < 0.5 ? min(b.g, 2.0 * o.g) : max(b.g, 2.0 * o.g - 1.0);
  r.b = o.b < 0.5 ? min(b.b, 2.0 * o.b) : max(b.b, 2.0 * o.b - 1.0);
  return clamp(r, 0.0, 1.0);
}
vec3 blendHardMix(vec3 b, vec3 o) {
  vec3 r = b + o;
  return vec3(r.r > 0.5 ? 1.0 : 0.0, r.g > 0.5 ? 1.0 : 0.0, r.b > 0.5 ? 1.0 : 0.0);
}
vec3 blendDissolve(vec3 b, vec3 o, float a, vec2 uv) {
  float d = fract(sin(dot(uv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  return d < a ? o : b;
}

// ── Simplified HSL component modes ───────────────────────────
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }
vec3 setLum(vec3 c, float l) {
  float d = l - lum(c);
  return clamp(c + d, 0.0, 1.0);
}
vec3 setSat(vec3 c, float s) {
  float cmax = max(c.r, max(c.g, c.b));
  float cmin = min(c.r, min(c.g, c.b));
  if (cmax == cmin) return vec3(0.0);
  float mid = (cmax + cmin) * 0.5;
  float t = s * 0.5;
  vec3 r;
  if (c.r == cmax) { r.r = cmax; r.g = mid + t; r.b = mid - t; }
  else if (c.g == cmax) { r.g = cmax; r.r = mid + t; r.b = mid - t; }
  else { r.b = cmax; r.r = mid + t; r.g = mid - t; }
  return clamp(r, 0.0, 1.0);
}
vec3 blendHue(vec3 b, vec3 o) { return setLum(setSat(o, sat(b)), lum(b)); }
vec3 blendSaturation(vec3 b, vec3 o) { return setLum(setSat(b, sat(o)), lum(b)); }
vec3 blendColorFunc(vec3 b, vec3 o) { return setLum(o, lum(b)); }
vec3 blendLuminosity(vec3 b, vec3 o) { return setLum(b, lum(o)); }

// ── Main dispatch ────────────────────────────────────────────
uniform sampler2D uTexture;
uniform vec3 uBgColor;
uniform int uBlendMode;

varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec3 bg = uBgColor;
  vec3 base = bg;
  vec3 over = src.rgb;
  float alpha = src.a;
  vec3 blended;

  int m = uBlendMode;

  // BLEND_MODES array indices:
  // 0=normal, 1=darken, 2=multiply, 3=colorBurn, 4=linearBurn
  // 5=darkerColor, 6=add, 7=lighten, 8=screen, 9=colorDodge
  // 10=linearDodge, 11=lighterColor, 12=overlay, 13=softLight
  // 14=hardLight, 15=linearLight, 16=vividLight, 17=pinLight
  // 18=hardMix, 19=difference, 20=exclusion, 21=subtract
  // 22=divide, 23=hue, 24=saturation, 25=color, 26=luminosity

       if (m == 0)  blended = blendNormal(base, over);
  else if (m == 1)  blended = blendDarken(base, over);
  else if (m == 2)  blended = blendMultiply(base, over);
  else if (m == 3)  blended = blendColorBurn(base, over);
  else if (m == 4)  blended = blendLinearBurn(base, over);
  else if (m == 5)  blended = blendDarkerColor(base, over);
  else if (m == 6)  blended = blendAdd(base, over);
  else if (m == 7)  blended = blendLighten(base, over);
  else if (m == 8)  blended = blendScreen(base, over);
  else if (m == 9)  blended = blendColorDodge(base, over);
  else if (m == 10) blended = blendLinearDodge(base, over);
  else if (m == 11) blended = blendLighterColor(base, over);
  else if (m == 12) blended = blendOverlay(base, over);
  else if (m == 13) blended = blendSoftLight(base, over);
  else if (m == 14) blended = blendHardLight(base, over);
  else if (m == 15) blended = blendLinearLight(base, over);
  else if (m == 16) blended = blendVividLight(base, over);
  else if (m == 17) blended = blendPinLight(base, over);
  else if (m == 18) blended = blendHardMix(base, over);
  else if (m == 19) blended = blendDifference(base, over);
  else if (m == 20) blended = blendExclusion(base, over);
  else if (m == 21) blended = blendSubtract(base, over);
  else if (m == 22) blended = blendDivide(base, over);
  else if (m == 23) blended = blendHue(base, over);
  else if (m == 24) blended = blendSaturation(base, over);
  else if (m == 25) blended = blendColorFunc(base, over);
  else if (m == 26) blended = blendLuminosity(base, over);
  else              blended = over;

  // Standard over-composite with background
  vec3 result = mix(base, blended, alpha);
  gl_FragColor = vec4(result, 1.0);
}
`;
}

/** Options: numeric values 0-26 matching BLEND_MODES array indices */
const blendOptions = BLEND_MODES.map((bm, idx) => ({
  label: bm.label,
  value: idx,
}));

export const blendModeEffect: EffectModule = {
  definition: def('blendMode', 'Blend Mode', 'blend', fullDescription, 1, [
    {
      id: 'mode',
      name: 'Mode',
      type: 'select',
      value: 0,
      defaultValue: 0,
      uniform: 'uBlendMode',
      options: blendOptions,
    },
    param({ id: 'bgColor', name: 'Background', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uBgColor' }),
  ]),
  fragmentShader: buildFragmentShader(),
};
