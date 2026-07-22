import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;

uniform float uHaloSize;
uniform float uHaloRingWidth;
uniform float uHaloIntensity;
uniform float uHaloSamples;
uniform float uThreshold;
uniform float uSoftKnee;
uniform vec3  uTint;
uniform float uUseSourceColor;

uniform float uSoftFocus;
uniform float uSoftFocusMix;

uniform float uChromatic;
uniform float uSaturation;
uniform float uBrightness;
uniform float uNoiseAmount;

uniform float uAnimate;
uniform float uAnimSpeed;
uniform float uProgress;

uniform float uBlendMode;
uniform float uMix;

varying vec2 vUv;

const float TAU = 6.28318530;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

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

// Soft-knee bright extract - amplifies the highlight so halos are visible
vec3 brightExtract(vec3 c, float thresh, float knee) {
  float lum = luma(c);
  float k = max(knee, 1e-4);
  float soft = clamp(lum - thresh + k, 0.0, 2.0 * k);
  soft = soft * soft / (4.0 * k);
  float mask = clamp(max(soft, lum - thresh), 0.0, 1.5);
  return c * mask * 1.5;
}

struct Cfg {
  float haloSize;
  float ringWidth;
  float haloIntensity;
  float samples;
  float threshold;
  float softKnee;
  vec3  tint;
  float useSource;
  float softFocus;
  float softFocusMix;
  float chromatic;
  float saturation;
  float brightness;
  float noise;
};

Cfg presetDreamy() {
  return Cfg(30.0, 0.35, 2.2, 20.0, 0.35, 0.4, vec3(1.0), 1.0, 2.0, 0.35, 0.2, 1.15, 1.15, 0.02);
}
Cfg presetBokehLarge() {
  return Cfg(55.0, 0.5, 2.5, 24.0, 0.4, 0.4, vec3(1.0), 1.0, 1.5, 0.3, 0.15, 1.1, 1.2, 0.0);
}
Cfg presetBokehTiny() {
  return Cfg(12.0, 0.25, 1.8, 16.0, 0.45, 0.3, vec3(1.0), 1.0, 1.0, 0.2, 0.05, 1.05, 1.1, 0.0);
}
Cfg presetGlowRings() {
  return Cfg(40.0, 0.15, 2.8, 24.0, 0.3, 0.5, vec3(1.0, 0.95, 0.85), 0.4, 3.0, 0.4, 0.25, 1.2, 1.25, 0.0);
}
Cfg presetSoftDream() {
  return Cfg(22.0, 0.55, 1.8, 18.0, 0.3, 0.6, vec3(1.0, 0.9, 0.9), 0.7, 4.0, 0.55, 0.1, 1.0, 1.15, 0.0);
}
Cfg presetPsychedelic() {
  return Cfg(45.0, 0.3, 2.5, 24.0, 0.25, 0.5, vec3(0.8, 0.5, 1.0), 0.3, 2.0, 0.4, 1.0, 1.4, 1.2, 0.02);
}
Cfg presetSubtle() {
  return Cfg(10.0, 0.3, 1.2, 14.0, 0.55, 0.3, vec3(1.0), 1.0, 0.8, 0.15, 0.0, 1.02, 1.05, 0.0);
}
Cfg presetCustom() {
  return Cfg(uHaloSize, uHaloRingWidth, uHaloIntensity, uHaloSamples,
             uThreshold, uSoftKnee, uTint, uUseSourceColor,
             uSoftFocus, uSoftFocusMix,
             uChromatic, uSaturation, uBrightness, uNoiseAmount);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetDreamy();
  if (s == 1) return presetBokehLarge();
  if (s == 2) return presetBokehTiny();
  if (s == 3) return presetGlowRings();
  if (s == 4) return presetSoftDream();
  if (s == 5) return presetPsychedelic();
  if (s == 6) return presetSubtle();
  return presetCustom();
}

// Fast 5-tap gaussian for soft focus
vec3 softFocus(vec2 uv, vec2 px, float radius) {
  vec3 sum = texture2D(uTexture, uv).rgb * 0.4;
  sum += texture2D(uTexture, uv + vec2( radius, 0.0) * px).rgb * 0.15;
  sum += texture2D(uTexture, uv + vec2(-radius, 0.0) * px).rgb * 0.15;
  sum += texture2D(uTexture, uv + vec2(0.0,  radius) * px).rgb * 0.15;
  sum += texture2D(uTexture, uv + vec2(0.0, -radius) * px).rgb * 0.15;
  return sum;
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec4 src = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  // Base color with optional soft focus
  vec3 baseColor = src.rgb;
  if (cfg.softFocusMix > 0.001) {
    vec3 soft = softFocus(vUv, px, cfg.softFocus);
    baseColor = mix(baseColor, soft, cfg.softFocusMix);
  }

  // Phase
  float phase = uProgress * TAU;
  if (uAnimate > 0.5) {
    phase += uTime * uAnimSpeed * 0.5;
  }

  // ---- FAST bokeh halo: single loop, chroma via per-channel radius ----
  int samples = int(clamp(cfg.samples, 8.0, 32.0));
  float fSamples = float(samples);
  float aspect = uResolution.x / uResolution.y;

  // Two "sub-rings" merged into one loop for smoother rings
  float radiusInner = cfg.haloSize * (1.0 - cfg.ringWidth * 0.5);
  float radiusOuter = cfg.haloSize;

  // Chroma: R samples at slightly larger radius, B at smaller
  float caR = 1.0 + cfg.chromatic * 0.08;
  float caB = 1.0 - cfg.chromatic * 0.08;

  vec3 accum = vec3(0.0);
  float totalW = 0.0;

  for (int i = 0; i < 32; i++) {
    if (i >= samples) break;
    float fi = float(i);
    float ang = (fi / fSamples) * TAU + phase;
    vec2 dir = vec2(cos(ang), sin(ang) * aspect);

    // Sample at outer ring radius
    vec2 sUvR = clamp(vUv + dir * radiusOuter * caR * px, 0.0, 1.0);
    vec2 sUvG = clamp(vUv + dir * radiusOuter * px, 0.0, 1.0);
    vec2 sUvB = clamp(vUv + dir * radiusOuter * caB * px, 0.0, 1.0);

    vec3 sR = texture2D(uTexture, sUvR).rgb;
    vec3 sG = texture2D(uTexture, sUvG).rgb;
    vec3 sB = texture2D(uTexture, sUvB).rgb;

    // Combine channels from different radii for chromatic ring
    vec3 sample3 = vec3(sR.r, sG.g, sB.b);

    vec3 bright = brightExtract(sample3, cfg.threshold, cfg.softKnee);
    vec3 col = cfg.useSource > 0.5 ? bright : vec3(luma(bright)) * cfg.tint;

    accum += col;
    totalW += 1.0;

    // Half the samples also contribute to inner ring for thickness
    if (mod(fi, 2.0) < 1.0) {
      vec2 sUv2 = clamp(vUv + dir * radiusInner * px, 0.0, 1.0);
      vec3 s2 = texture2D(uTexture, sUv2).rgb;
      vec3 b2 = brightExtract(s2, cfg.threshold, cfg.softKnee);
      vec3 c2 = cfg.useSource > 0.5 ? b2 : vec3(luma(b2)) * cfg.tint;
      accum += c2 * 0.7;
      totalW += 0.7;
    }
  }

  vec3 halo = accum / max(totalW, 1.0);
  halo *= cfg.haloIntensity;

  // Sat + bright pop
  vec3 hsv = rgb2hsv(halo);
  hsv.y = clamp(hsv.y * cfg.saturation, 0.0, 1.5);
  hsv.z = clamp(hsv.z * cfg.brightness, 0.0, 5.0);
  halo = hsv2rgb(hsv);

  if (cfg.noise > 0.001) {
    float n = hash(vUv * uResolution + uTime * 0.1) - 0.5;
    halo += vec3(n) * cfg.noise;
  }

  // Blend
  vec3 result;
  int blend = int(uBlendMode + 0.5);
  if (blend == 0) {
    vec3 a = clamp(baseColor, 0.0, 1.0);
    vec3 b = clamp(halo, 0.0, 1.0);
    result = 1.0 - (1.0 - a) * (1.0 - b);
    result += max(halo - 1.0, 0.0);
  } else if (blend == 1) {
    result = baseColor + halo;
  } else if (blend == 2) {
    result = max(baseColor, halo);
  } else {
    result = baseColor + halo * 0.5;
  }

  vec3 final = mix(src.rgb, result, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(clamp(final, 0.0, 2.0), src.a);
}
`;

export const haloBurEffect: EffectModule = {
  definition: def(
    'haloBur',
    'Halo Blur',
    'blur',
    'Dreamy bokeh halo blur — fast single-pass with ring-shaped defocus. 7 presets.',
    1,
    [
      param({ id: 'style', name: 'Style Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Dreamy',           value: 0 },
          { label: 'Bokeh Large',      value: 1 },
          { label: 'Bokeh Tiny',       value: 2 },
          { label: 'Glow Rings',       value: 3 },
          { label: 'Soft Dream',       value: 4 },
          { label: 'Psychedelic',      value: 5 },
          { label: 'Subtle',           value: 6 },
          { label: 'Custom',           value: 7 },
        ], uniform: 'uStyle' }),

      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'blendMode', name: 'Blend Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Screen',  value: 0 },
          { label: 'Add',     value: 1 },
          { label: 'Lighten', value: 2 },
          { label: 'Overlay', value: 3 },
        ], uniform: 'uBlendMode' }),

      param({ id: 'animate',   name: 'Auto Animate',   type: 'boolean', value: false, defaultValue: false, uniform: 'uAnimate' }),
      param({ id: 'animSpeed', name: 'Animation Speed', value: 1.0, defaultValue: 1.0, min: -5, max: 5, step: 0.05, uniform: 'uAnimSpeed' }),
      param({ id: 'progress',  name: 'Progress (manual)', value: 0, defaultValue: 0, min: -10, max: 10, step: 0.001, uniform: 'uProgress' }),

      param({ id: 'haloSize',      name: 'Custom: Halo Size (px)', value: 30, defaultValue: 30, min: 2, max: 100, step: 1, uniform: 'uHaloSize' }),
      param({ id: 'haloRingWidth', name: 'Custom: Ring Width',      value: 0.35, defaultValue: 0.35, min: 0.05, max: 1, step: 0.01, uniform: 'uHaloRingWidth' }),
      param({ id: 'haloIntensity', name: 'Custom: Halo Intensity',  value: 2.2,  defaultValue: 2.2,  min: 0, max: 8, step: 0.05, uniform: 'uHaloIntensity' }),
      param({ id: 'haloSamples',   name: 'Custom: Quality (Samples)', value: 20, defaultValue: 20, min: 8, max: 32, step: 1, uniform: 'uHaloSamples' }),

      param({ id: 'threshold', name: 'Custom: Highlight Threshold', value: 0.35, defaultValue: 0.35, min: 0, max: 1.5, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'softKnee',  name: 'Custom: Threshold Soft Knee', value: 0.4, defaultValue: 0.4, min: 0.01, max: 1, step: 0.01, uniform: 'uSoftKnee' }),

      param({ id: 'useSourceColor', name: 'Custom: Use Source Color', type: 'boolean', value: true, defaultValue: true, uniform: 'uUseSourceColor' }),
      param({ id: 'tint',           name: 'Custom: Halo Tint',        type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uTint' }),
      param({ id: 'saturation',     name: 'Custom: Saturation',       value: 1.15, defaultValue: 1.15, min: 0, max: 3, step: 0.05, uniform: 'uSaturation' }),
      param({ id: 'brightness',     name: 'Custom: Brightness',       value: 1.15, defaultValue: 1.15, min: 0, max: 3, step: 0.05, uniform: 'uBrightness' }),

      param({ id: 'softFocus',    name: 'Custom: Soft Focus Radius', value: 2.0, defaultValue: 2.0, min: 0, max: 10, step: 0.1, uniform: 'uSoftFocus' }),
      param({ id: 'softFocusMix', name: 'Custom: Soft Focus Amount', value: 0.35, defaultValue: 0.35, min: 0, max: 1, step: 0.01, uniform: 'uSoftFocusMix' }),

      param({ id: 'chromatic',   name: 'Custom: Chromatic Rings', value: 0.2, defaultValue: 0.2, min: 0, max: 1.5, step: 0.01, uniform: 'uChromatic' }),
      param({ id: 'noiseAmount', name: 'Custom: Noise',           value: 0.02, defaultValue: 0.02, min: 0, max: 0.3, step: 0.005, uniform: 'uNoiseAmount' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};