import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;

uniform float uBurnAmount;
uniform float uBurnSize;
uniform float uBurnEdgeGlow;
uniform vec3  uBurnEdgeColor;
uniform vec3  uBurnCharColor;
uniform float uBurnAnimSpeed;

uniform float uScratchAmount;
uniform float uScratchWidth;
uniform float uScratchIntensity;
uniform vec3  uScratchColor;
uniform float uScratchAnimSpeed;

uniform float uDustAmount;
uniform float uDustSize;
uniform float uHairAmount;

uniform float uGrainAmount;
uniform float uGrainSize;

uniform float uFlickerAmount;
uniform float uJitterAmount;

uniform float uSaturation;
uniform float uContrast;
uniform float uWarmth;

uniform float uAnimate;
uniform float uSeed;
uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

float hash1(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2  hash2v(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i);
  float b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0));
  float d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

struct Cfg {
  float burnAmount;
  float burnSize;
  float burnEdgeGlow;
  vec3  burnEdgeColor;
  vec3  burnCharColor;
  float burnAnimSpeed;
  float scratchAmount;
  float scratchWidth;
  float scratchIntensity;
  vec3  scratchColor;
  float scratchAnimSpeed;
  float dustAmount;
  float dustSize;
  float hairAmount;
  float grainAmount;
  float grainSize;
  float flickerAmount;
  float jitterAmount;
  float saturation;
  float contrast;
  float warmth;
};

Cfg presetClassicBurn() {
  return Cfg(0.4, 0.15, 0.8, vec3(1.0, 0.6, 0.1), vec3(0.15, 0.08, 0.03), 0.3,
             0.3, 0.5, 0.6, vec3(1.0, 0.9, 0.7), 0.8,
             0.4, 1.0, 0.3,
             0.4, 1.5,
             0.35, 0.15,
             1.1, 0.15, 0.25);
}
Cfg presetSevereDamage() {
  return Cfg(0.8, 0.25, 1.0, vec3(1.0, 0.4, 0.1), vec3(0.05, 0.02, 0.0), 0.5,
             0.7, 1.2, 0.9, vec3(1.0, 0.85, 0.6), 1.2,
             0.7, 1.5, 0.6,
             0.6, 2.0,
             0.6, 0.35,
             0.8, 0.3, 0.4);
}
Cfg presetLightAging() {
  return Cfg(0.05, 0.08, 0.5, vec3(1.0, 0.7, 0.3), vec3(0.2, 0.15, 0.1), 0.1,
             0.15, 0.35, 0.4, vec3(1.0, 0.95, 0.85), 0.3,
             0.2, 0.7, 0.15,
             0.25, 1.0,
             0.15, 0.05,
             1.0, 0.1, 0.15);
}
Cfg presetProjectorMisfire() {
  return Cfg(0.5, 0.4, 1.0, vec3(1.0, 0.5, 0.1), vec3(0.1, 0.05, 0.02), 1.0,
             0.4, 0.8, 0.7, vec3(1.0, 0.9, 0.75), 1.5,
             0.5, 1.0, 0.4,
             0.5, 1.8,
             0.55, 0.4,
             0.9, 0.2, 0.35);
}
Cfg presetVintageFootage() {
  return Cfg(0.02, 0.05, 0.3, vec3(1.0, 0.7, 0.4), vec3(0.15, 0.1, 0.05), 0.05,
             0.3, 0.4, 0.5, vec3(1.0, 0.95, 0.85), 0.4,
             0.3, 0.8, 0.25,
             0.35, 1.2,
             0.2, 0.08,
             0.9, 0.15, 0.3);
}
Cfg presetGrindhouse() {
  return Cfg(0.6, 0.2, 0.9, vec3(1.0, 0.5, 0.15), vec3(0.08, 0.04, 0.02), 0.7,
             0.9, 1.5, 1.0, vec3(1.0, 0.85, 0.65), 2.0,
             0.6, 1.2, 0.7,
             0.7, 2.5,
             0.5, 0.25,
             0.85, 0.35, 0.35);
}
Cfg presetSubtle() {
  return Cfg(0.02, 0.06, 0.4, vec3(1.0, 0.7, 0.4), vec3(0.15, 0.1, 0.05), 0.0,
             0.1, 0.3, 0.35, vec3(1.0, 0.95, 0.85), 0.1,
             0.15, 0.6, 0.1,
             0.2, 1.0,
             0.1, 0.03,
             1.0, 0.05, 0.1);
}
Cfg presetCustom() {
  return Cfg(uBurnAmount, uBurnSize, uBurnEdgeGlow, uBurnEdgeColor, uBurnCharColor, uBurnAnimSpeed,
             uScratchAmount, uScratchWidth, uScratchIntensity, uScratchColor, uScratchAnimSpeed,
             uDustAmount, uDustSize, uHairAmount,
             uGrainAmount, uGrainSize,
             uFlickerAmount, uJitterAmount,
             uSaturation, uContrast, uWarmth);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetClassicBurn();
  if (s == 1) return presetSevereDamage();
  if (s == 2) return presetLightAging();
  if (s == 3) return presetProjectorMisfire();
  if (s == 4) return presetVintageFootage();
  if (s == 5) return presetGrindhouse();
  if (s == 6) return presetSubtle();
  return presetCustom();
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Burn holes: FBM-based blobs that create holes with hot edges
// Returns: burnMask (0..1 how much is burnt), edgeGlow (0..1 rim glow)
void computeBurn(vec2 uv, Cfg cfg, float t, out float burnMask, out float edgeGlow) {
  if (cfg.burnAmount < 0.001) { burnMask = 0.0; edgeGlow = 0.0; return; }

  vec2 p = uv * (5.0 / max(cfg.burnSize, 0.02));
  // Animate positions of burn spots
  p += vec2(t * cfg.burnAnimSpeed * 0.4, t * cfg.burnAnimSpeed * 0.2);

  float n = fbm(p);
  // Amount slides the threshold - more amount = larger burn regions
  float threshold = 1.0 - cfg.burnAmount * 0.8;
  burnMask = smoothstep(threshold, threshold + 0.05, n);

  // Edge glow: a ring just outside the burnt area
  float edgeStart = threshold - 0.08;
  float edgeEnd = threshold + 0.02;
  edgeGlow = smoothstep(edgeStart, threshold, n) * (1.0 - smoothstep(threshold, edgeEnd, n));
  edgeGlow *= cfg.burnEdgeGlow;
}

// Vertical scratches: thin bright lines that reroll over time
float computeScratches(vec2 uv, Cfg cfg, float t) {
  if (cfg.scratchAmount < 0.001) return 0.0;
  float total = 0.0;
  int count = int(clamp(cfg.scratchAmount * 12.0, 1.0, 12.0));

  for (int i = 0; i < 12; i++) {
    if (i >= count) break;
    float fi = float(i);
    // Each scratch's X position changes over time
    float seed = floor(t * cfg.scratchAnimSpeed * 3.0) + fi * 17.3 + uSeed;
    float x = hash1(seed);
    float width = (hash1(seed + 1.7) * 0.8 + 0.4) * cfg.scratchWidth * 0.002;
    // Some scratches don't span full height
    float yMin = hash1(seed + 2.1) * 0.3;
    float yMax = 1.0 - hash1(seed + 3.3) * 0.3;
    if (uv.y < yMin || uv.y > yMax) continue;
    float d = abs(uv.x - x);
    // Add a bit of wobble along Y for organic feel
    d += (hash1(seed + uv.y * 7.0) - 0.5) * 0.001;
    if (d < width) {
      total = max(total, (1.0 - d / width) * cfg.scratchIntensity);
    }
  }
  return total;
}

// Dust: small dark or bright specks
float computeDust(vec2 uv, Cfg cfg, float t) {
  if (cfg.dustAmount < 0.001) return 0.0;
  float total = 0.0;
  int count = int(clamp(cfg.dustAmount * 20.0, 1.0, 20.0));

  for (int i = 0; i < 20; i++) {
    if (i >= count) break;
    float fi = float(i);
    float seed = floor(t * 5.0) + fi * 23.7 + uSeed * 3.7;
    vec2 pos = vec2(hash1(seed), hash1(seed + 1.3));
    float size = (hash1(seed + 2.1) * 0.5 + 0.5) * cfg.dustSize * 0.008;
    float d = length(uv - pos);
    if (d < size) {
      total = max(total, 1.0 - d / size);
    }
  }
  return total;
}

// Hairs: curved thin lines
float computeHair(vec2 uv, Cfg cfg, float t) {
  if (cfg.hairAmount < 0.001) return 0.0;
  float total = 0.0;
  int count = int(clamp(cfg.hairAmount * 4.0, 1.0, 4.0));

  for (int i = 0; i < 4; i++) {
    if (i >= count) break;
    float fi = float(i);
    float seed = floor(t * 1.5) + fi * 31.7 + uSeed * 7.1;

    // Random start point + direction
    vec2 start = vec2(hash1(seed), hash1(seed + 1.7));
    float angle = hash1(seed + 2.3) * 6.28;
    float len = hash1(seed + 3.1) * 0.3 + 0.1;
    // Curve amount
    float curve = (hash1(seed + 4.3) - 0.5) * 3.0;

    // Sample along the hair, find closest distance
    for (int j = 0; j < 8; j++) {
      float tt = float(j) / 7.0;
      float a = angle + curve * tt * tt * 0.3;
      vec2 pt = start + vec2(cos(a), sin(a)) * tt * len;
      float d = distance(uv, pt);
      if (d < 0.002) {
        total = max(total, 1.0 - d / 0.002);
      }
    }
  }
  return total;
}

void main() {
  vec4 srcOrig = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  float t = uAnimate > 0.5 ? uTime : 0.0;

  // ---- Frame jitter (whole image shifts) ----
  vec2 jitter = vec2(0.0);
  if (cfg.jitterAmount > 0.001) {
    float jSeed = floor(t * 24.0) + uSeed;
    jitter = (hash2v(vec2(jSeed, jSeed * 1.7)) - 0.5) * cfg.jitterAmount * 0.01;
  }

  vec4 src = texture2D(uTexture, clamp(vUv + jitter, 0.0, 1.0));
  vec3 col = src.rgb;

  // ---- Warmth, saturation, contrast ----
  col += vec3(cfg.warmth * 0.15, cfg.warmth * 0.02, -cfg.warmth * 0.15);
  float l = luma(col);
  col = mix(vec3(l), col, cfg.saturation);
  col = (col - 0.5) * (1.0 + cfg.contrast) + 0.5;

  // ---- Burn holes ----
  float burnMask, edgeGlow;
  computeBurn(vUv, cfg, t, burnMask, edgeGlow);
  // Where burnt: fade to char color
  col = mix(col, cfg.burnCharColor, burnMask);
  // Hot glowing edges
  col += cfg.burnEdgeColor * edgeGlow * 1.2;

  // ---- Scratches ----
  float scratch = computeScratches(vUv, cfg, t);
  col += cfg.scratchColor * scratch;

  // ---- Dust ----
  float dust = computeDust(vUv, cfg, t);
  col -= vec3(dust * 0.5);

  // ---- Hairs (dark curly lines) ----
  float hair = computeHair(vUv, cfg, t);
  col -= vec3(hair * 0.6);

  // ---- Film grain ----
  if (cfg.grainAmount > 0.001) {
    float gs = max(cfg.grainSize, 0.5);
    vec2 grainUv = floor(vUv * uResolution / gs);
    float gt = uAnimate > 0.5 ? floor(t * 24.0) : 0.0;
    float n = hash2(grainUv + gt + uSeed) - 0.5;
    // Grain concentrated in shadows (more realistic)
    float shadowBoost = 1.0 + (1.0 - luma(col)) * 1.2;
    col += vec3(n) * cfg.grainAmount * 0.35 * shadowBoost;
  }

  // ---- Flicker (whole frame brightness variation) ----
  if (cfg.flickerAmount > 0.001) {
    float fs = floor(t * 24.0) + uSeed * 2.7;
    float fl = 1.0 + (hash1(fs) - 0.5) * cfg.flickerAmount;
    col *= fl;
  }

  col = clamp(col, 0.0, 1.5);
  vec3 result = mix(srcOrig.rgb, col, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(result, srcOrig.a);
}
`;

export const ccBurnFilmEffect: EffectModule = {
  definition: def(
    'ccBurnFilm',
    'CC Burn Film',
    'stylize',
    'Realistic film damage: burn holes, scratches, dust, hair, grain, flicker & jitter. 7 damage styles.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Damage Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Classic Burn',       value: 0 },
          { label: 'Severe Damage',      value: 1 },
          { label: 'Light Aging',        value: 2 },
          { label: 'Projector Misfire',  value: 3 },
          { label: 'Vintage Footage',    value: 4 },
          { label: 'Grindhouse',         value: 5 },
          { label: 'Subtle',             value: 6 },
          { label: 'Custom',             value: 7 },
        ], uniform: 'uStyle' }),

      // ===== GLOBAL =====
      param({ id: 'mix',     name: 'Mix',        value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'animate', name: 'Animate',    type: 'boolean', value: true, defaultValue: true, uniform: 'uAnimate' }),
      param({ id: 'seed',    name: 'Random Seed', value: 0, defaultValue: 0, min: 0, max: 100, step: 0.1, uniform: 'uSeed' }),

      // ===== CUSTOM: Burn Holes =====
      param({ id: 'burnAmount',     name: 'Custom: Burn Amount',       value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uBurnAmount' }),
      param({ id: 'burnSize',       name: 'Custom: Burn Hole Size',    value: 0.15, defaultValue: 0.15, min: 0.02, max: 0.5, step: 0.01, uniform: 'uBurnSize' }),
      param({ id: 'burnEdgeGlow',   name: 'Custom: Burn Edge Glow',    value: 0.8, defaultValue: 0.8, min: 0, max: 2, step: 0.05, uniform: 'uBurnEdgeGlow' }),
      param({ id: 'burnEdgeColor',  name: 'Custom: Burn Edge Color',   type: 'color', value: '#ff9928', defaultValue: '#ff9928', uniform: 'uBurnEdgeColor' }),
      param({ id: 'burnCharColor',  name: 'Custom: Burn Char Color',   type: 'color', value: '#26140a', defaultValue: '#26140a', uniform: 'uBurnCharColor' }),
      param({ id: 'burnAnimSpeed',  name: 'Custom: Burn Anim Speed',   value: 0.3, defaultValue: 0.3, min: 0, max: 3, step: 0.05, uniform: 'uBurnAnimSpeed' }),

      // ===== CUSTOM: Scratches =====
      param({ id: 'scratchAmount',    name: 'Custom: Scratch Amount',    value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uScratchAmount' }),
      param({ id: 'scratchWidth',     name: 'Custom: Scratch Width',     value: 0.5, defaultValue: 0.5, min: 0.1, max: 3, step: 0.05, uniform: 'uScratchWidth' }),
      param({ id: 'scratchIntensity', name: 'Custom: Scratch Intensity', value: 0.6, defaultValue: 0.6, min: 0, max: 1.5, step: 0.05, uniform: 'uScratchIntensity' }),
      param({ id: 'scratchColor',     name: 'Custom: Scratch Color',     type: 'color', value: '#ffe6b3', defaultValue: '#ffe6b3', uniform: 'uScratchColor' }),
      param({ id: 'scratchAnimSpeed', name: 'Custom: Scratch Anim Speed', value: 0.8, defaultValue: 0.8, min: 0, max: 5, step: 0.05, uniform: 'uScratchAnimSpeed' }),

      // ===== CUSTOM: Dust & Hair =====
      param({ id: 'dustAmount', name: 'Custom: Dust Amount', value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uDustAmount' }),
      param({ id: 'dustSize',   name: 'Custom: Dust Size',   value: 1.0, defaultValue: 1.0, min: 0.2, max: 3, step: 0.05, uniform: 'uDustSize' }),
      param({ id: 'hairAmount', name: 'Custom: Hair Amount', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uHairAmount' }),

      // ===== CUSTOM: Grain =====
      param({ id: 'grainAmount', name: 'Custom: Grain Amount', value: 0.4, defaultValue: 0.4, min: 0, max: 1.5, step: 0.01, uniform: 'uGrainAmount' }),
      param({ id: 'grainSize',   name: 'Custom: Grain Size',   value: 1.5, defaultValue: 1.5, min: 0.5, max: 6, step: 0.1, uniform: 'uGrainSize' }),

      // ===== CUSTOM: Frame Artifacts =====
      param({ id: 'flickerAmount', name: 'Custom: Flicker Amount', value: 0.35, defaultValue: 0.35, min: 0, max: 1, step: 0.01, uniform: 'uFlickerAmount' }),
      param({ id: 'jitterAmount',  name: 'Custom: Frame Jitter',    value: 0.15, defaultValue: 0.15, min: 0, max: 1, step: 0.01, uniform: 'uJitterAmount' }),

      // ===== CUSTOM: Color =====
      param({ id: 'saturation', name: 'Custom: Saturation', value: 1.1, defaultValue: 1.1, min: 0, max: 2, step: 0.05, uniform: 'uSaturation' }),
      param({ id: 'contrast',   name: 'Custom: Contrast',   value: 0.15, defaultValue: 0.15, min: -1, max: 1, step: 0.01, uniform: 'uContrast' }),
      param({ id: 'warmth',     name: 'Custom: Warmth',     value: 0.25, defaultValue: 0.25, min: -1, max: 1, step: 0.01, uniform: 'uWarmth' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};