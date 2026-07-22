import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;
uniform float uPointAX;
uniform float uPointAY;
uniform float uPointBX;
uniform float uPointBY;

uniform vec3  uBoltColor;
uniform vec3  uGlowColor;
uniform float uBoltIntensity;
uniform float uGlowIntensity;
uniform float uGlowSize;

uniform float uThickness;
uniform float uTaper;
uniform float uSegments;
uniform float uJitter;
uniform float uBranchCount;
uniform float uBranchLength;
uniform float uBranchChance;

uniform float uAnimate;
uniform float uFlickerSpeed;
uniform float uFlickerAmount;
uniform float uAutoStrike;
uniform float uStrikeInterval;

uniform float uCoreBrightness;
uniform float uBlendMode;
uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

float hash11(float n) { return fract(sin(n) * 43758.5453); }
float hash21(vec2 p)  { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2  hash22(vec2 p)  {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453) - 0.5;
}

// Distance from point to line segment
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float d = max(dot(ba, ba), 1e-6);
  float h = clamp(dot(pa, ba) / d, 0.0, 1.0);
  return length(pa - ba * h);
}

// Distance to a tapered line - t at endpoint a = 0, at endpoint b = 1
float taperedSegment(vec2 p, vec2 a, vec2 b, float t0, float t1, float thickA, float thickB) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float d = max(dot(ba, ba), 1e-6);
  float h = clamp(dot(pa, ba) / d, 0.0, 1.0);
  float dist = length(pa - ba * h);
  float thickness = mix(thickA, thickB, h);
  return dist / max(thickness, 1e-5);
}

// Distance from p to the jittered polyline from a to b
// Returns (distance / thickness, min_h) for glow calc
float lightningBolt(vec2 p, vec2 a, vec2 b, float t0, float thickBase, float jitter, float taper, float seed, int segments) {
  vec2 dir = b - a;
  float len = length(dir);
  vec2 perp = vec2(-dir.y, dir.x) / max(len, 1e-6);

  float minDist = 1e6;
  int segs = segments;

  // Build jittered polyline
  vec2 prev = a;
  float prevThick = thickBase;
  for (int i = 1; i <= 32; i++) {
    if (i > segs) break;
    float ft = float(i) / float(segs);
    vec2 straight = mix(a, b, ft);
    // Jitter perpendicular to bolt direction, dying out at endpoints
    float endFade = sin(ft * PI);
    float jx = (hash11(seed + float(i) * 3.71) - 0.5) * 2.0;
    vec2 jittered = straight + perp * jx * jitter * endFade;
    if (i == segs) jittered = b;

    // Thickness tapers linearly from base to base*(1-taper) at end
    float thick = mix(thickBase, thickBase * (1.0 - taper), ft);

    float d = taperedSegment(p, prev, jittered, 0.0, 1.0, prevThick, thick);
    minDist = min(minDist, d);
    prev = jittered;
    prevThick = thick;
  }
  return minDist;
}

// Add branching bolts spawned from random points along main bolt
float branchingBolts(vec2 p, vec2 a, vec2 b, float thickBase, float jitter, float taper, float branchLen, float branchChance, float seed, int branchCount, int segments) {
  vec2 dir = b - a;
  float len = length(dir);
  vec2 perp = vec2(-dir.y, dir.x) / max(len, 1e-6);

  float minDist = 1e6;

  for (int i = 0; i < 8; i++) {
    if (i >= branchCount) break;
    float fi = float(i);
    float chance = hash11(seed * 17.3 + fi * 4.7);
    if (chance > branchChance) continue;

    // Branch origin: random point along main bolt
    float t = 0.2 + hash11(seed + fi * 2.3) * 0.6;
    vec2 origin = mix(a, b, t);

    // Branch direction: perp with random sign, plus some forward component
    float side = hash11(seed + fi * 5.1) > 0.5 ? 1.0 : -1.0;
    float forward = hash11(seed + fi * 7.3) * 0.5;
    vec2 branchDir = normalize(perp * side + normalize(dir) * forward);

    // Branch endpoint
    float bLen = len * branchLen * (0.3 + hash11(seed + fi * 11.7) * 0.7);
    vec2 branchEnd = origin + branchDir * bLen;

    // Branch has thinner base and more jitter
    float d = lightningBolt(p, origin, branchEnd, 0.0,
                            thickBase * 0.5, jitter * 1.5, 0.8,
                            seed + fi * 31.7, max(segments / 2, 4));
    minDist = min(minDist, d);
  }
  return minDist;
}

struct Cfg {
  vec3 boltColor;
  vec3 glowColor;
  float boltIntensity;
  float glowIntensity;
  float glowSize;
  float thickness;
  float taper;
  float segments;
  float jitter;
  float branchCount;
  float branchLength;
  float branchChance;
  float flickerSpeed;
  float flickerAmount;
  float coreBrightness;
};

Cfg presetClassic() {
  return Cfg(
    vec3(0.7, 0.85, 1.0), vec3(0.3, 0.5, 1.0),
    1.5, 1.2, 3.0,
    0.006, 0.5, 16.0, 0.05, 4.0, 0.4, 0.7,
    30.0, 0.4, 2.5
  );
}
Cfg presetTeslaCoil() {
  return Cfg(
    vec3(0.9, 0.85, 1.0), vec3(0.5, 0.4, 1.0),
    2.0, 1.8, 4.0,
    0.008, 0.3, 24.0, 0.08, 6.0, 0.5, 0.9,
    60.0, 0.6, 3.0
  );
}
Cfg presetChain() {
  return Cfg(
    vec3(0.5, 0.9, 1.0), vec3(0.1, 0.6, 1.0),
    1.4, 1.0, 2.5,
    0.005, 0.4, 20.0, 0.12, 8.0, 0.6, 0.85,
    15.0, 0.35, 2.0
  );
}
Cfg presetThunderstorm() {
  return Cfg(
    vec3(1.0, 0.95, 0.85), vec3(0.6, 0.55, 0.5),
    1.8, 0.9, 5.0,
    0.010, 0.7, 28.0, 0.15, 8.0, 0.7, 0.95,
    12.0, 0.7, 2.8
  );
}
Cfg presetPlasma() {
  return Cfg(
    vec3(1.0, 0.5, 1.0), vec3(0.8, 0.2, 1.0),
    1.6, 1.5, 3.5,
    0.007, 0.2, 20.0, 0.10, 5.0, 0.4, 0.75,
    45.0, 0.5, 2.5
  );
}
Cfg presetLaser() {
  return Cfg(
    vec3(1.0, 0.2, 0.15), vec3(1.0, 0.1, 0.05),
    2.5, 2.0, 2.0,
    0.004, 0.1, 8.0, 0.02, 0.0, 0.0, 0.0,
    20.0, 0.2, 4.0
  );
}
Cfg presetCustom() {
  return Cfg(
    uBoltColor, uGlowColor,
    uBoltIntensity, uGlowIntensity, uGlowSize,
    uThickness, uTaper, uSegments, uJitter,
    uBranchCount, uBranchLength, uBranchChance,
    uFlickerSpeed, uFlickerAmount, uCoreBrightness
  );
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetClassic();
  if (s == 1) return presetTeslaCoil();
  if (s == 2) return presetChain();
  if (s == 3) return presetThunderstorm();
  if (s == 4) return presetPlasma();
  if (s == 5) return presetLaser();
  return presetCustom();
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec4 src = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  // Aspect-correct working space
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vUv * vec2(aspect, 1.0);
  vec2 a = vec2(uPointAX, uPointAY) * vec2(aspect, 1.0);
  vec2 b = vec2(uPointBX, uPointBY) * vec2(aspect, 1.0);

  // Time: quantised to flickerSpeed for stable-but-flickering shapes
  float t = uAnimate > 0.5 ? uTime : 0.0;
  float boltSeed = floor(t * cfg.flickerSpeed);

  // Auto strike: bolt fades in/out at intervals
  float strikeMask = 1.0;
  if (uAutoStrike > 0.5) {
    float period = max(uStrikeInterval, 0.1);
    float phase = mod(t, period) / period;
    // 15% of the cycle the bolt is active, sharp on-off with tail
    strikeMask = phase < 0.15 ? (1.0 - phase / 0.15) : 0.0;
    strikeMask = pow(strikeMask, 0.7);
    // Re-seed each strike
    boltSeed = floor(t / period);
  }

  int segments = int(clamp(cfg.segments, 4.0, 32.0));
  int branches = int(clamp(cfg.branchCount, 0.0, 8.0));

  // Main bolt distance (normalised by thickness)
  float mainDist = lightningBolt(p, a, b, 0.0,
                                 cfg.thickness, cfg.jitter, cfg.taper,
                                 boltSeed * 1.31, segments);

  // Branches
  float branchDist = 1e6;
  if (branches > 0) {
    branchDist = branchingBolts(p, a, b,
                                cfg.thickness, cfg.jitter, cfg.taper,
                                cfg.branchLength, cfg.branchChance,
                                boltSeed * 2.71, branches, segments);
  }

  float dist = min(mainDist, branchDist);

  // Bolt core: sharp bright line
  float core = 1.0 - smoothstep(0.0, 1.0, dist);
  core = pow(core, cfg.coreBrightness);

  // Glow halo: soft falloff
  float glow = exp(-dist * dist / max(cfg.glowSize * cfg.glowSize, 0.01));

  // Flicker: rapid brightness variation
  float flicker = 1.0;
  if (uAnimate > 0.5 && cfg.flickerAmount > 0.001) {
    float fSeed = floor(t * cfg.flickerSpeed * 2.0);
    flicker = 1.0 - hash11(fSeed) * cfg.flickerAmount;
  }

  // Combine
  vec3 coreCol = cfg.boltColor * core * cfg.boltIntensity;
  vec3 glowCol = cfg.glowColor * glow * cfg.glowIntensity;
  vec3 lightCol = (coreCol + glowCol) * flicker * strikeMask;

  // Blend
  int blend = int(uBlendMode + 0.5);
  vec3 result;
  if (blend == 0) {
    // Screen
    vec3 a2 = clamp(src.rgb, 0.0, 1.0);
    vec3 b2 = clamp(lightCol, 0.0, 1.0);
    result = 1.0 - (1.0 - a2) * (1.0 - b2);
    result += max(lightCol - 1.0, 0.0);
  } else if (blend == 1) {
    // Add
    result = src.rgb + lightCol;
  } else {
    // Replace on alpha
    result = lightCol;
    float a3 = clamp(max(lightCol.r, max(lightCol.g, lightCol.b)), 0.0, 1.0);
    gl_FragColor = vec4(result, a3 * clamp(uMix, 0.0, 1.0));
    return;
  }

  vec3 final = mix(src.rgb, result, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(final, src.a);
}
`;

export const zapsEffect: EffectModule = {
  definition: def(
    'zaps',
    'Zaps / Lightning',
    'generate',
    'Procedural branching lightning bolts with 6 styles, flicker, auto-strike and full customization.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Style Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Classic Lightning',   value: 0 },
          { label: 'Tesla Coil',          value: 1 },
          { label: 'Chain Lightning',     value: 2 },
          { label: 'Thunderstorm',        value: 3 },
          { label: 'Plasma Arc',          value: 4 },
          { label: 'Sci-Fi Laser',        value: 5 },
          { label: 'Custom',              value: 6 },
        ], uniform: 'uStyle' }),

      // ===== ENDPOINTS =====
      param({ id: 'pointAX', name: 'Point A - X', value: 0.2, defaultValue: 0.2, min: -0.5, max: 1.5, step: 0.001, uniform: 'uPointAX' }),
      param({ id: 'pointAY', name: 'Point A - Y', value: 0.2, defaultValue: 0.2, min: -0.5, max: 1.5, step: 0.001, uniform: 'uPointAY' }),
      param({ id: 'pointBX', name: 'Point B - X', value: 0.8, defaultValue: 0.8, min: -0.5, max: 1.5, step: 0.001, uniform: 'uPointBX' }),
      param({ id: 'pointBY', name: 'Point B - Y', value: 0.8, defaultValue: 0.8, min: -0.5, max: 1.5, step: 0.001, uniform: 'uPointBY' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'blendMode', name: 'Blend Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Screen',       value: 0 },
          { label: 'Add',          value: 1 },
          { label: 'Replace (alpha)', value: 2 },
        ], uniform: 'uBlendMode' }),

      // ===== ANIMATION =====
      param({ id: 'animate',     name: 'Animate',           type: 'boolean', value: true, defaultValue: true, uniform: 'uAnimate' }),
      param({ id: 'autoStrike',  name: 'Auto Strike (flash)', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoStrike' }),
      param({ id: 'strikeInterval', name: 'Strike Interval (sec)', value: 2.0, defaultValue: 2.0, min: 0.3, max: 15, step: 0.1, uniform: 'uStrikeInterval' }),

      // ===== CUSTOM: Color =====
      param({ id: 'boltColor', name: 'Custom: Bolt Color', type: 'color', value: '#b0d8ff', defaultValue: '#b0d8ff', uniform: 'uBoltColor' }),
      param({ id: 'glowColor', name: 'Custom: Glow Color', type: 'color', value: '#4d80ff', defaultValue: '#4d80ff', uniform: 'uGlowColor' }),
      param({ id: 'boltIntensity', name: 'Custom: Bolt Intensity', value: 1.5, defaultValue: 1.5, min: 0, max: 5, step: 0.05, uniform: 'uBoltIntensity' }),
      param({ id: 'glowIntensity', name: 'Custom: Glow Intensity', value: 1.2, defaultValue: 1.2, min: 0, max: 5, step: 0.05, uniform: 'uGlowIntensity' }),
      param({ id: 'glowSize',      name: 'Custom: Glow Size',      value: 3.0, defaultValue: 3.0, min: 0.5, max: 10, step: 0.1, uniform: 'uGlowSize' }),
      param({ id: 'coreBrightness', name: 'Custom: Core Brightness', value: 2.5, defaultValue: 2.5, min: 1, max: 8, step: 0.1, uniform: 'uCoreBrightness' }),

      // ===== CUSTOM: Bolt Shape =====
      param({ id: 'thickness', name: 'Custom: Thickness',       value: 0.006, defaultValue: 0.006, min: 0.001, max: 0.05, step: 0.0005, uniform: 'uThickness' }),
      param({ id: 'taper',     name: 'Custom: Taper',            value: 0.5,   defaultValue: 0.5,   min: 0, max: 1, step: 0.01, uniform: 'uTaper' }),
      param({ id: 'segments',  name: 'Custom: Segments',         value: 16,    defaultValue: 16,    min: 4, max: 32, step: 1, uniform: 'uSegments' }),
      param({ id: 'jitter',    name: 'Custom: Jitter',           value: 0.05,  defaultValue: 0.05,  min: 0, max: 0.3, step: 0.005, uniform: 'uJitter' }),

      // ===== CUSTOM: Branching =====
      param({ id: 'branchCount',  name: 'Custom: Branch Count',  value: 4,   defaultValue: 4,   min: 0, max: 8, step: 1, uniform: 'uBranchCount' }),
      param({ id: 'branchLength', name: 'Custom: Branch Length', value: 0.4, defaultValue: 0.4, min: 0.1, max: 1.2, step: 0.01, uniform: 'uBranchLength' }),
      param({ id: 'branchChance', name: 'Custom: Branch Chance', value: 0.7, defaultValue: 0.7, min: 0, max: 1, step: 0.01, uniform: 'uBranchChance' }),

      // ===== CUSTOM: Flicker =====
      param({ id: 'flickerSpeed',  name: 'Custom: Flicker Speed',  value: 30, defaultValue: 30, min: 1, max: 120, step: 1, uniform: 'uFlickerSpeed' }),
      param({ id: 'flickerAmount', name: 'Custom: Flicker Amount', value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uFlickerAmount' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};