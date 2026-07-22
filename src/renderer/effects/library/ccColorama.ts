import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;

uniform float uPreset;
uniform float uModifyChannel;

uniform float uInputPhase;
uniform float uInputCycles;
uniform float uOutputCycles;

uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;

uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;

uniform float uAutoAnimate;
uniform float uAnimSpeed;

uniform float uPreserveAlpha;
uniform float uBlendMode;
uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Sample a 5-color gradient at t (0..1)
vec3 sampleGradient(float t, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5) {
  t = fract(t);
  float seg = t * 4.0;
  if (seg < 1.0) return mix(c1, c2, seg);
  if (seg < 2.0) return mix(c2, c3, seg - 1.0);
  if (seg < 3.0) return mix(c3, c4, seg - 2.0);
  return mix(c4, c5, seg - 3.0);
}

vec3 gradientPreset(float t, int idx) {
  t = fract(t);
  if (idx == 0) {
    // Fire (black -> red -> orange -> yellow -> white)
    return sampleGradient(t, vec3(0.02, 0.0, 0.0), vec3(0.6, 0.05, 0.0),
                          vec3(1.0, 0.35, 0.05), vec3(1.0, 0.85, 0.2), vec3(1.0));
  } else if (idx == 1) {
    // Ice (black -> deep blue -> cyan -> light blue -> white)
    return sampleGradient(t, vec3(0.02, 0.04, 0.1), vec3(0.05, 0.15, 0.5),
                          vec3(0.15, 0.6, 0.95), vec3(0.7, 0.9, 1.0), vec3(1.0));
  } else if (idx == 2) {
    // Rainbow (hue cycle)
    return hsv2rgb(vec3(t, 1.0, 1.0));
  } else if (idx == 3) {
    // Sepia (dark brown -> tan -> cream)
    return sampleGradient(t, vec3(0.08, 0.05, 0.03), vec3(0.3, 0.2, 0.1),
                          vec3(0.6, 0.45, 0.25), vec3(0.9, 0.75, 0.5), vec3(1.0, 0.95, 0.85));
  } else if (idx == 4) {
    // Cyanotype (deep blue -> cyan -> white)
    return sampleGradient(t, vec3(0.02, 0.05, 0.15), vec3(0.05, 0.2, 0.5),
                          vec3(0.1, 0.5, 0.85), vec3(0.4, 0.8, 0.95), vec3(1.0));
  } else if (idx == 5) {
    // Solarize (dark -> bright -> hue-shift -> dark)
    return sampleGradient(t, vec3(0.05, 0.0, 0.1), vec3(0.8, 0.2, 0.5),
                          vec3(1.0, 0.9, 0.3), vec3(0.2, 0.8, 0.5), vec3(0.05, 0.05, 0.3));
  } else if (idx == 6) {
    // Duotone Magenta/Cyan
    return sampleGradient(t, vec3(0.05, 0.0, 0.15), vec3(0.4, 0.05, 0.35),
                          vec3(0.7, 0.15, 0.5), vec3(0.15, 0.7, 0.85), vec3(0.85, 0.95, 1.0));
  } else if (idx == 7) {
    // Sunset (deep purple -> pink -> orange -> yellow)
    return sampleGradient(t, vec3(0.05, 0.02, 0.15), vec3(0.4, 0.1, 0.45),
                          vec3(0.95, 0.4, 0.35), vec3(1.0, 0.75, 0.35), vec3(1.0, 0.95, 0.7));
  } else if (idx == 8) {
    // Toxic (black -> deep green -> lime -> yellow-green)
    return sampleGradient(t, vec3(0.02, 0.05, 0.02), vec3(0.05, 0.35, 0.05),
                          vec3(0.4, 0.85, 0.1), vec3(0.85, 1.0, 0.2), vec3(1.0, 1.0, 0.9));
  } else if (idx == 9) {
    // Vaporwave (deep purple -> hot pink -> cyan -> pink)
    return sampleGradient(t, vec3(0.1, 0.05, 0.3), vec3(0.9, 0.15, 0.65),
                          vec3(0.2, 0.85, 0.95), vec3(0.95, 0.55, 0.9), vec3(1.0, 0.9, 0.95));
  } else if (idx == 10) {
    // Blueprint (dark blue -> mid blue -> pale white)
    return sampleGradient(t, vec3(0.03, 0.1, 0.35), vec3(0.08, 0.25, 0.55),
                          vec3(0.15, 0.4, 0.7), vec3(0.55, 0.75, 0.9), vec3(0.95, 0.98, 1.0));
  } else if (idx == 11) {
    // Thermal (black -> purple -> red -> yellow -> white)
    return sampleGradient(t, vec3(0.0), vec3(0.35, 0.0, 0.6),
                          vec3(1.0, 0.15, 0.15), vec3(1.0, 0.85, 0.1), vec3(1.0));
  } else if (idx == 12) {
    // Custom (uses 5 user-defined colors)
    return sampleGradient(t, uColor1, uColor2, uColor3, uColor4, uColor5);
  }
  return vec3(t);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);

  // Time input (for animation)
  float animPhase = 0.0;
  if (uAutoAnimate > 0.5) {
    animPhase = uTime * uAnimSpeed * 0.1;
  }

  // ---- What input value gets remapped? ----
  int mode = int(uModifyChannel + 0.5);
  vec3 hsv = rgb2hsv(src.rgb);
  float inputVal;
  if (mode == 0) inputVal = luma(src.rgb);   // Luminance
  else if (mode == 1) inputVal = hsv.x;      // Hue
  else if (mode == 2) inputVal = hsv.y;      // Saturation
  else if (mode == 3) inputVal = hsv.z;      // Value
  else if (mode == 4) inputVal = src.r;      // Red channel
  else if (mode == 5) inputVal = src.g;      // Green channel
  else inputVal = src.b;                     // Blue channel

  // Apply input phase and cycles (matches AE Colorama)
  float t = inputVal * uInputCycles + uInputPhase + animPhase;
  // Output cycles: how many times the gradient repeats end-to-end
  t = t * uOutputCycles;

  // Sample gradient
  int preset = int(uPreset + 0.5);
  vec3 mapped = gradientPreset(t, preset);

  // Apply saturation, brightness, contrast to the mapped color
  vec3 mHsv = rgb2hsv(mapped);
  mHsv.y = clamp(mHsv.y * uSaturation, 0.0, 1.5);
  mHsv.z = clamp(mHsv.z * uBrightness, 0.0, 3.0);
  mapped = hsv2rgb(mHsv);
  mapped = (mapped - 0.5) * (1.0 + uContrast) + 0.5;
  mapped = clamp(mapped, 0.0, 1.5);

  // Blend modes
  vec3 result;
  int blend = int(uBlendMode + 0.5);
  if (blend == 0) {
    // Replace (standard Colorama)
    result = mapped;
  } else if (blend == 1) {
    // Multiply
    result = src.rgb * mapped;
  } else if (blend == 2) {
    // Screen
    vec3 a = clamp(src.rgb, 0.0, 1.0);
    vec3 b = clamp(mapped, 0.0, 1.0);
    result = 1.0 - (1.0 - a) * (1.0 - b);
  } else if (blend == 3) {
    // Overlay
    vec3 ov;
    for (int i = 0; i < 3; i++) {
      float base = src.rgb[i];
      float over = mapped[i];
      ov[i] = base < 0.5 ? 2.0 * base * over : 1.0 - 2.0 * (1.0 - base) * (1.0 - over);
    }
    result = ov;
  } else {
    // Preserve luma - use mapped hue but original brightness
    vec3 mh = rgb2hsv(mapped);
    vec3 sh = rgb2hsv(src.rgb);
    result = hsv2rgb(vec3(mh.x, mh.y, sh.z));
  }

  vec3 final = mix(src.rgb, result, clamp(uMix, 0.0, 1.0));

  float outA = uPreserveAlpha > 0.5 ? src.a : src.a;
  gl_FragColor = vec4(final, outA);
}
`;

export const ccColoramaEffect: EffectModule = {
  definition: def(
    'ccColorama',
    'CC Colorama',
    'color',
    'Color remapping via gradient palettes. 12 presets or custom 5-color ramp.',
    1,
    [
      // ===== PRESET SWITCHER =====
      param({ id: 'preset', name: 'Color Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Fire',              value: 0 },
          { label: 'Ice',               value: 1 },
          { label: 'Rainbow',           value: 2 },
          { label: 'Sepia',             value: 3 },
          { label: 'Cyanotype',         value: 4 },
          { label: 'Solarize',          value: 5 },
          { label: 'Duotone Mag/Cyan',  value: 6 },
          { label: 'Sunset',            value: 7 },
          { label: 'Toxic Green',       value: 8 },
          { label: 'Vaporwave',         value: 9 },
          { label: 'Blueprint',         value: 10 },
          { label: 'Thermal',           value: 11 },
          { label: 'Custom Ramp',       value: 12 },
        ], uniform: 'uPreset' }),

      // ===== INPUT/OUTPUT =====
      param({ id: 'modifyChannel', name: 'Modify Channel', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Luminance',   value: 0 },
          { label: 'Hue',         value: 1 },
          { label: 'Saturation',  value: 2 },
          { label: 'Value',       value: 3 },
          { label: 'Red',         value: 4 },
          { label: 'Green',       value: 5 },
          { label: 'Blue',        value: 6 },
        ], uniform: 'uModifyChannel' }),
      param({ id: 'inputPhase',   name: 'Input Phase',   value: 0, defaultValue: 0, min: -1, max: 1, step: 0.005, uniform: 'uInputPhase' }),
      param({ id: 'inputCycles',  name: 'Input Cycles',  value: 1.0, defaultValue: 1.0, min: 0.1, max: 10, step: 0.05, uniform: 'uInputCycles' }),
      param({ id: 'outputCycles', name: 'Output Cycles', value: 1.0, defaultValue: 1.0, min: 0.1, max: 10, step: 0.05, uniform: 'uOutputCycles' }),

      // ===== ANIMATION =====
      param({ id: 'autoAnimate', name: 'Auto Animate Phase', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoAnimate' }),
      param({ id: 'animSpeed',   name: 'Animation Speed',    value: 1.0, defaultValue: 1.0, min: -10, max: 10, step: 0.05, uniform: 'uAnimSpeed' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'blendMode', name: 'Blend Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Replace',        value: 0 },
          { label: 'Multiply',       value: 1 },
          { label: 'Screen',         value: 2 },
          { label: 'Overlay',        value: 3 },
          { label: 'Preserve Luma',  value: 4 },
        ], uniform: 'uBlendMode' }),
      param({ id: 'preserveAlpha', name: 'Preserve Alpha', type: 'boolean', value: true, defaultValue: true, uniform: 'uPreserveAlpha' }),

      // ===== TONE ADJUSTMENTS =====
      param({ id: 'saturation', name: 'Saturation', value: 1.0, defaultValue: 1.0, min: 0, max: 3, step: 0.05, uniform: 'uSaturation' }),
      param({ id: 'brightness', name: 'Brightness', value: 1.0, defaultValue: 1.0, min: 0, max: 3, step: 0.05, uniform: 'uBrightness' }),
      param({ id: 'contrast',   name: 'Contrast',   value: 0.0, defaultValue: 0.0, min: -1, max: 1, step: 0.01, uniform: 'uContrast' }),

      // ===== CUSTOM RAMP COLORS =====
      param({ id: 'color1', name: 'Custom Ramp: Color 1 (darkest)',  type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColor1' }),
      param({ id: 'color2', name: 'Custom Ramp: Color 2',            type: 'color', value: '#4d1a99', defaultValue: '#4d1a99', uniform: 'uColor2' }),
      param({ id: 'color3', name: 'Custom Ramp: Color 3 (midtone)',  type: 'color', value: '#ff2266', defaultValue: '#ff2266', uniform: 'uColor3' }),
      param({ id: 'color4', name: 'Custom Ramp: Color 4',            type: 'color', value: '#ffcc33', defaultValue: '#ffcc33', uniform: 'uColor4' }),
      param({ id: 'color5', name: 'Custom Ramp: Color 5 (brightest)',type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor5' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};