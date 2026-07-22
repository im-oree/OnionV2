import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uEra;
uniform float uMix;

uniform vec3  uColorShadows;
uniform vec3  uColorMids;
uniform vec3  uColorHighs;
uniform float uWarmth;
uniform float uSaturation;
uniform float uContrast;
uniform float uFade;
uniform float uLiftBlacks;

uniform float uGrainAmount;
uniform float uGrainSize;
uniform float uGrainInShadows;
uniform float uAnimateGrain;

uniform float uHalation;
uniform float uHalationThreshold;

uniform float uVignetteAmount;
uniform float uVignetteSize;

uniform float uLightLeak;
uniform vec3  uLightLeakColor;
uniform float uLightLeakPos;

uniform float uScratches;
uniform float uDust;
uniform float uFlicker;

uniform float uDateStamp;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float hash1(float n) { return fract(sin(n) * 43758.5453); }

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

struct Cfg {
  vec3 shadows;
  vec3 mids;
  vec3 highs;
  float warmth;
  float saturation;
  float contrast;
  float fade;
  float liftBlacks;
  float grainAmount;
  float grainSize;
  float halation;
  float halationThresh;
  float vignetteAmount;
  float vignetteSize;
  float lightLeak;
  vec3  leakColor;
  float leakPos;
  float scratches;
  float dust;
  float flicker;
};

Cfg presetSuper8() {
  return Cfg(
    vec3(0.15, 0.08, 0.02),
    vec3(0.02, 0.0, -0.05),
    vec3(0.1, 0.05, -0.05),
    0.35, 1.15, 0.15, 0.18, 0.12,
    0.55, 1.6,
    0.35, 0.75,
    0.55, 0.65,
    0.3, vec3(1.0, 0.35, 0.1), 0.15,
    0.15, 0.25, 0.15
  );
}
Cfg presetVHS() {
  return Cfg(
    vec3(0.0, 0.02, 0.08),
    vec3(-0.03, 0.0, 0.02),
    vec3(-0.05, 0.02, 0.08),
    -0.15, 0.85, -0.15, 0.35, 0.2,
    0.35, 2.5,
    0.0, 0.95,
    0.35, 0.75,
    0.05, vec3(1.0, 0.4, 0.5), 0.5,
    0.0, 0.1, 0.25
  );
}
Cfg presetPolaroid() {
  return Cfg(
    vec3(0.12, 0.05, -0.05),
    vec3(0.05, 0.02, -0.02),
    vec3(0.15, 0.1, 0.02),
    0.3, 0.95, 0.05, 0.28, 0.18,
    0.3, 1.3,
    0.15, 0.8,
    0.45, 0.5,
    0.0, vec3(1.0, 0.8, 0.5), 0.5,
    0.05, 0.15, 0.05
  );
}
Cfg presetKodachrome() {
  return Cfg(
    vec3(-0.05, 0.02, 0.05),
    vec3(0.05, 0.02, -0.02),
    vec3(0.1, 0.05, -0.08),
    0.15, 1.25, 0.2, 0.08, 0.05,
    0.25, 1.2,
    0.2, 0.7,
    0.4, 0.7,
    0.0, vec3(1.0, 0.6, 0.2), 0.5,
    0.05, 0.1, 0.02
  );
}
Cfg preset70sFaded() {
  return Cfg(
    vec3(0.18, 0.1, 0.02),
    vec3(0.08, 0.03, -0.05),
    vec3(0.12, 0.05, -0.1),
    0.4, 0.75, -0.1, 0.35, 0.25,
    0.4, 1.4,
    0.25, 0.75,
    0.5, 0.6,
    0.15, vec3(1.0, 0.5, 0.2), 0.3,
    0.1, 0.2, 0.1
  );
}
Cfg preset80sCamcorder() {
  return Cfg(
    vec3(0.0, 0.02, 0.05),
    vec3(0.0, 0.0, 0.0),
    vec3(0.05, 0.02, -0.02),
    0.0, 0.9, 0.1, 0.15, 0.15,
    0.4, 2.0,
    0.15, 0.8,
    0.25, 0.85,
    0.1, vec3(1.0, 0.9, 0.5), 0.6,
    0.02, 0.05, 0.2
  );
}
Cfg presetSepia() {
  return Cfg(
    vec3(0.2, 0.12, 0.0),
    vec3(0.15, 0.08, -0.05),
    vec3(0.2, 0.15, 0.0),
    0.6, 0.35, 0.25, 0.2, 0.15,
    0.35, 1.5,
    0.1, 0.85,
    0.5, 0.55,
    0.05, vec3(0.9, 0.7, 0.3), 0.5,
    0.25, 0.35, 0.05
  );
}
Cfg presetBlackWhite() {
  return Cfg(
    vec3(0.0),
    vec3(0.0),
    vec3(0.0),
    0.0, 0.0, 0.3, 0.15, 0.1,
    0.45, 1.4,
    0.2, 0.85,
    0.4, 0.6,
    0.0, vec3(1.0), 0.5,
    0.15, 0.2, 0.08
  );
}
Cfg presetModern() {
  return Cfg(
    vec3(0.02, 0.01, 0.0),
    vec3(0.01, 0.005, -0.005),
    vec3(0.02, 0.01, -0.01),
    0.05, 1.05, 0.05, 0.05, 0.03,
    0.15, 1.0,
    0.05, 0.85,
    0.2, 0.75,
    0.0, vec3(1.0), 0.5,
    0.0, 0.0, 0.0
  );
}
Cfg presetCustom() {
  return Cfg(
    uColorShadows, uColorMids, uColorHighs,
    uWarmth, uSaturation, uContrast, uFade, uLiftBlacks,
    uGrainAmount, uGrainSize,
    uHalation, uHalationThreshold,
    uVignetteAmount, uVignetteSize,
    uLightLeak, uLightLeakColor, uLightLeakPos,
    uScratches, uDust, uFlicker
  );
}

Cfg pickPreset() {
  int e = int(uEra + 0.5);
  if (e == 0) return presetSuper8();
  if (e == 1) return presetVHS();
  if (e == 2) return presetPolaroid();
  if (e == 3) return presetKodachrome();
  if (e == 4) return preset70sFaded();
  if (e == 5) return preset80sCamcorder();
  if (e == 6) return presetSepia();
  if (e == 7) return presetBlackWhite();
  if (e == 8) return presetModern();
  return presetCustom();
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 threeWayGrade(vec3 c, vec3 sh, vec3 md, vec3 hi) {
  float l = luma(c);
  float shMask = 1.0 - smoothstep(0.0, 0.4, l);
  float hiMask = smoothstep(0.6, 1.0, l);
  float mdMask = 1.0 - shMask - hiMask;
  return c + sh * shMask + md * mdMask + hi * hiMask;
}

vec3 warmth(vec3 c, float w) {
  return c + vec3(w * 0.15, w * 0.02, -w * 0.15);
}

vec3 applyContrast(vec3 c, float amt) {
  return (c - 0.5) * (1.0 + amt) + 0.5;
}

vec3 applyFade(vec3 c, float amt, float lift) {
  vec3 faded = mix(c, vec3(0.5, 0.48, 0.42), amt * 0.4);
  return mix(faded, faded + vec3(lift), lift);
}

vec3 halation(vec2 uv, vec3 col, float amount, float threshold, vec2 px) {
  vec3 blur = vec3(0.0);
  for (int i = -3; i <= 3; i++) {
    for (int j = -3; j <= 3; j++) {
      vec2 off = vec2(float(i), float(j)) * px * 3.0;
      vec3 s = texture2D(uTexture, clamp(uv + off, 0.0, 1.0)).rgb;
      float lum = luma(s);
      float mask = smoothstep(threshold, threshold + 0.1, lum);
      blur += s * mask;
    }
  }
  blur /= 49.0;
  vec3 halo = vec3(blur.r * 1.5, blur.r * 0.3, blur.r * 0.1);
  return col + halo * amount;
}

float scratches(vec2 uv, float amount, float t) {
  if (amount < 0.001) return 0.0;
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float seed = floor(t * 6.0) + fi * 17.3;
    float x = hash1(seed);
    float width = hash1(seed + 1.7) * 0.002 + 0.0005;
    float d = abs(uv.x - x);
    if (d < width) total = max(total, 1.0 - d / width);
  }
  return total * amount;
}

float dustSpots(vec2 uv, float amount, float t) {
  if (amount < 0.001) return 0.0;
  float total = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float seed = floor(t * 4.0) + fi * 23.7;
    vec2 pos = vec2(hash1(seed), hash1(seed + 1.3));
    float size = hash1(seed + 2.1) * 0.01 + 0.002;
    float d = length(uv - pos);
    if (d < size) total = max(total, 1.0 - d / size);
  }
  return total * amount;
}

// Fake date stamp: draws "88 08 15" style blocks in bottom-right
float dateStamp(vec2 uv, float show) {
  if (show < 0.5) return 0.0;
  vec2 pos = uv - vec2(0.72, 0.06);
  if (pos.x < 0.0 || pos.x > 0.25 || pos.y < 0.0 || pos.y > 0.03) return 0.0;
  float col = floor(pos.x * 32.0);
  float row = floor(pos.y * 60.0);
  float pattern = hash(vec2(col, row * 0.1));
  if (pattern < 0.55) return 0.0;
  return 1.0;
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec4 src = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  vec3 col = src.rgb;

  // ---- Saturation ----
  vec3 hsv = rgb2hsv(col);
  hsv.y *= cfg.saturation;
  col = hsv2rgb(hsv);

  // ---- Warmth ----
  col = warmth(col, cfg.warmth);

  // ---- Contrast ----
  col = applyContrast(col, cfg.contrast);

  // ---- Three-way color grade ----
  col = threeWayGrade(col, cfg.shadows, cfg.mids, cfg.highs);

  // ---- Fade + lift blacks ----
  col = applyFade(col, cfg.fade, cfg.liftBlacks);

  // ---- Halation (red glow around highlights) ----
  if (cfg.halation > 0.001) {
    col = halation(vUv, col, cfg.halation, cfg.halationThresh, px);
  }

  // ---- Vignette ----
  vec2 vc = vUv - 0.5;
  float aspect = uResolution.x / uResolution.y;
  vc.x *= aspect;
  float dist = length(vc);
  float vigStart = cfg.vignetteSize * 0.6;
  float vigEnd = cfg.vignetteSize + 0.3;
  float vig = smoothstep(vigStart, vigEnd, dist);
  col *= 1.0 - vig * cfg.vignetteAmount;

  // ---- Light leak ----
  if (cfg.lightLeak > 0.001) {
    float leakX = cfg.leakPos;
    float leakDist = abs(vUv.x - leakX);
    float leak = exp(-leakDist * leakDist * 20.0);
    leak *= smoothstep(0.0, 0.5, vUv.y);
    col += cfg.leakColor * leak * cfg.lightLeak;
  }

  // ---- Grain ----
  if (cfg.grainAmount > 0.001) {
    float gSize = max(cfg.grainSize, 0.5);
    vec2 grainUv = floor(vUv * uResolution / gSize);
    float grainT = uAnimateGrain > 0.5 ? floor(uTime * 24.0) : 0.0;
    float n = hash(grainUv + grainT) - 0.5;
    float shadowBoost = mix(1.0, 1.0 + (1.0 - luma(col)) * 1.5, uGrainInShadows);
    col += vec3(n) * cfg.grainAmount * 0.4 * shadowBoost;
  }

  // ---- Scratches & dust ----
  float sc = scratches(vUv, cfg.scratches, uTime);
  col += vec3(sc);
  float du = dustSpots(vUv, cfg.dust, uTime);
  col -= vec3(du * 0.6);

  // ---- Flicker (frame brightness variation) ----
  if (cfg.flicker > 0.001) {
    float fl = 1.0 + (hash1(floor(uTime * 24.0)) - 0.5) * cfg.flicker;
    col *= fl;
  }

  // ---- Date stamp ----
  float ds = dateStamp(vUv, uDateStamp);
  col = mix(col, vec3(1.0, 0.5, 0.0), ds);

  col = mix(src.rgb, col, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(clamp(col, 0.0, 1.5), src.a);
}
`;

export const vintageCamEffect: EffectModule = {
  definition: def(
    'vintageCam',
    'Vintage Cam',
    'stylize',
    'Film emulation with 9 era presets, color grading, halation, grain, light leaks, scratches & dust.',
    1,
    [
      // ===== ERA PRESET SWITCHER =====
      param({ id: 'era', name: 'Era Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Super 8 (60s home movie)',    value: 0 },
          { label: 'VHS (80s tape)',               value: 1 },
          { label: 'Polaroid (instant)',           value: 2 },
          { label: 'Kodachrome (60s slide)',       value: 3 },
          { label: '70s Faded',                    value: 4 },
          { label: '80s Camcorder',                value: 5 },
          { label: 'Sepia (early 1900s)',          value: 6 },
          { label: 'Black & White',                value: 7 },
          { label: 'Modern Film',                  value: 8 },
          { label: 'Custom',                       value: 9 },
        ], uniform: 'uEra' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'animateGrain', name: 'Animate Grain', type: 'boolean', value: true, defaultValue: true, uniform: 'uAnimateGrain' }),
      param({ id: 'grainInShadows', name: 'Grain in Shadows', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uGrainInShadows' }),
      param({ id: 'dateStamp', name: 'Show Date Stamp', type: 'boolean', value: false, defaultValue: false, uniform: 'uDateStamp' }),

      // ===== CUSTOM: Color Grade =====
      param({ id: 'colorShadows', name: 'Custom: Shadow Tint', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColorShadows' }),
      param({ id: 'colorMids',    name: 'Custom: Midtone Tint', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColorMids' }),
      param({ id: 'colorHighs',   name: 'Custom: Highlight Tint', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColorHighs' }),
      param({ id: 'warmth',      name: 'Custom: Warmth',      value: 0,    defaultValue: 0,    min: -1, max: 1, step: 0.01, uniform: 'uWarmth' }),
      param({ id: 'saturation',  name: 'Custom: Saturation',  value: 1.0,  defaultValue: 1.0,  min: 0, max: 2, step: 0.01, uniform: 'uSaturation' }),
      param({ id: 'contrast',    name: 'Custom: Contrast',    value: 0,    defaultValue: 0,    min: -1, max: 1, step: 0.01, uniform: 'uContrast' }),
      param({ id: 'fade',        name: 'Custom: Fade',        value: 0.1,  defaultValue: 0.1,  min: 0, max: 1, step: 0.01, uniform: 'uFade' }),
      param({ id: 'liftBlacks',  name: 'Custom: Lift Blacks', value: 0.05, defaultValue: 0.05, min: 0, max: 0.5, step: 0.01, uniform: 'uLiftBlacks' }),

      // ===== CUSTOM: Grain =====
      param({ id: 'grainAmount', name: 'Custom: Grain Amount', value: 0.3, defaultValue: 0.3, min: 0, max: 1.5, step: 0.01, uniform: 'uGrainAmount' }),
      param({ id: 'grainSize',   name: 'Custom: Grain Size',   value: 1.5, defaultValue: 1.5, min: 0.5, max: 8, step: 0.1, uniform: 'uGrainSize' }),

      // ===== CUSTOM: Halation =====
      param({ id: 'halation',          name: 'Custom: Halation',       value: 0.2, defaultValue: 0.2, min: 0, max: 1.5, step: 0.01, uniform: 'uHalation' }),
      param({ id: 'halationThreshold', name: 'Custom: Halation Threshold', value: 0.75, defaultValue: 0.75, min: 0.3, max: 1, step: 0.01, uniform: 'uHalationThreshold' }),

      // ===== CUSTOM: Vignette =====
      param({ id: 'vignetteAmount', name: 'Custom: Vignette Amount', value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uVignetteAmount' }),
      param({ id: 'vignetteSize',   name: 'Custom: Vignette Size',   value: 0.7, defaultValue: 0.7, min: 0.1, max: 1.5, step: 0.01, uniform: 'uVignetteSize' }),

      // ===== CUSTOM: Light Leak =====
      param({ id: 'lightLeak',      name: 'Custom: Light Leak Amount', value: 0.1, defaultValue: 0.1, min: 0, max: 1, step: 0.01, uniform: 'uLightLeak' }),
      param({ id: 'lightLeakColor', name: 'Custom: Light Leak Color',  type: 'color', value: '#ff6633', defaultValue: '#ff6633', uniform: 'uLightLeakColor' }),
      param({ id: 'lightLeakPos',   name: 'Custom: Light Leak Position', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uLightLeakPos' }),

      // ===== CUSTOM: Damage =====
      param({ id: 'scratches', name: 'Custom: Scratches', value: 0.1,  defaultValue: 0.1,  min: 0, max: 1, step: 0.01, uniform: 'uScratches' }),
      param({ id: 'dust',      name: 'Custom: Dust Spots', value: 0.15, defaultValue: 0.15, min: 0, max: 1, step: 0.01, uniform: 'uDust' }),
      param({ id: 'flicker',   name: 'Custom: Flicker',    value: 0.1,  defaultValue: 0.1,  min: 0, max: 1, step: 0.01, uniform: 'uFlicker' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};