import type { EffectModule } from './types';
import { def, param } from './types';

const FLARE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uCenterX;
uniform float uCenterY;

uniform float uStyle;
uniform float uIntensity;
uniform vec3  uColor;
uniform float uEdgeFalloff;

uniform float uCoreSize;
uniform float uCoreBrightness;
uniform float uHaloSize;
uniform float uHaloStrength;
uniform float uStreakLength;
uniform float uStreakThickness;
uniform float uStreakStrength;
uniform float uRayCount;
uniform float uRaySharpness;
uniform float uRayLength;
uniform float uRayStrength;
uniform float uRayRotation;
uniform float uGhostCount;
uniform float uGhostSpacing;
uniform float uGhostSize;
uniform float uGhostStrength;
uniform float uGhostDispersion;
uniform float uIrisRingRadius;
uniform float uIrisRingStrength;
uniform float uBlendMode;

varying vec2 vUv;

float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3  saturate(vec3 x)  { return clamp(x, 0.0, 1.0); }

vec3 spectrum(float t) {
  t = fract(t);
  vec3 c = vec3(
    abs(t * 6.0 - 3.0) - 1.0,
    2.0 - abs(t * 6.0 - 2.0),
    2.0 - abs(t * 6.0 - 4.0)
  );
  return clamp(c, 0.0, 1.0);
}

float hexagon(vec2 p, float r) {
  p = abs(p);
  float d = max(p.x * 0.866 + p.y * 0.5, p.y);
  return smoothstep(r, r * 0.7, d);
}

float disk(vec2 p, float r, float softness) {
  return smoothstep(r, r * (1.0 - softness), length(p));
}

// -------------------- STYLE PRESETS --------------------
// Bundles that override the individual sliders.
// Style 5 (Custom) uses user sliders unchanged.
struct FlareCfg {
  vec3  color;
  float coreSize, coreBright;
  float haloSize, haloStr;
  float streakLen, streakThk, streakStr;
  float rayCount, raySharp, rayLen, rayStr;
  float ghostCount, ghostSpacing, ghostSize, ghostStr, ghostDisp;
  float irisR, irisStr;
};

FlareCfg presetSun() {
  return FlareCfg(
    vec3(1.0, 0.8, 0.47),
    1.5, 3.0,
    0.8, 0.9,
    0.0, 1.0, 0.0,
    12.0, 0.5, 1.2, 1.0,
    6.0, 1.0, 0.06, 0.4, 0.6,
    0.15, 0.0
  );
}
FlareCfg presetAnamorphic() {
  return FlareCfg(
    vec3(0.63, 0.82, 1.0),
    0.6, 3.5,
    0.3, 0.4,
    1.5, 0.6, 2.0,
    6.0, 0.7, 0.6, 0.0,
    3.0, 1.0, 0.05, 0.3, 0.3,
    0.15, 0.0
  );
}
FlareCfg presetStarburst() {
  return FlareCfg(
    vec3(1.0, 1.0, 1.0),
    0.8, 4.0,
    0.4, 0.5,
    0.0, 1.0, 0.0,
    8.0, 0.9, 2.0, 1.5,
    0.0, 1.0, 0.06, 0.0, 0.0,
    0.15, 0.0
  );
}
FlareCfg presetSpectral() {
  return FlareCfg(
    vec3(1.0, 1.0, 1.0),
    1.0, 2.5,
    0.4, 0.4,
    0.0, 1.0, 0.0,
    6.0, 0.8, 0.8, 0.6,
    10.0, 1.0, 0.06, 0.9, 1.5,
    0.20, 1.2
  );
}
FlareCfg presetMinimal() {
  return FlareCfg(
    vec3(1.0, 0.93, 0.8),
    1.0, 1.5,
    0.5, 0.3,
    0.0, 1.0, 0.0,
    4.0, 0.6, 0.4, 0.3,
    2.0, 1.0, 0.04, 0.2, 0.2,
    0.15, 0.0
  );
}
FlareCfg presetCustom() {
  // Read from user uniforms
  return FlareCfg(
    uColor,
    uCoreSize, uCoreBrightness,
    uHaloSize, uHaloStrength,
    uStreakLength, uStreakThickness, uStreakStrength,
    uRayCount, uRaySharpness, uRayLength, uRayStrength,
    uGhostCount, uGhostSpacing, uGhostSize, uGhostStrength, uGhostDispersion,
    uIrisRingRadius, uIrisRingStrength
  );
}

FlareCfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetSun();
  if (s == 1) return presetAnamorphic();
  if (s == 2) return presetStarburst();
  if (s == 3) return presetSpectral();
  if (s == 4) return presetMinimal();
  return presetCustom();
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 center = vec2(uCenterX, uCenterY);

  float aspect = uResolution.x / uResolution.y;
  vec2  uv     = vUv;
  vec2  p      = (uv - center) * vec2(aspect, 1.0);

  vec2 flareAxis = center - vec2(0.5, 0.5);
  vec2 axisDir   = length(flareAxis) > 1e-4 ? normalize(flareAxis) : vec2(1.0, 0.0);

  float srcOffset = length(flareAxis) * 2.0;
  float edgeFade  = exp(-srcOffset * srcOffset * uEdgeFalloff);

  float dist = length(p);

  FlareCfg cfg = pickPreset();

  vec3 flare = vec3(0.0);

  // Core
  float core = exp(-dist * dist / max(cfg.coreSize * cfg.coreSize * 0.01, 1e-4));
  core = pow(core, 1.5);
  flare += core * cfg.coreBright * cfg.color;

  // Halo
  float halo = exp(-dist / max(cfg.haloSize * 0.3, 1e-3));
  flare += halo * cfg.haloStr * cfg.color * 0.6;

  // Anamorphic streak
  if (cfg.streakStr > 0.001) {
    float sx = p.x;
    float sy = p.y;
    float streak = exp(-sy * sy / max(cfg.streakThk * cfg.streakThk * 0.0002, 1e-6));
    streak *= exp(-abs(sx) / max(cfg.streakLen * 0.4, 0.001));
    vec3 streakCol = mix(cfg.color, vec3(0.4, 0.6, 1.0), 0.6);
    flare += streak * cfg.streakStr * streakCol;
  }

  // Rays
  if (cfg.rayStr > 0.001) {
    float angle = atan(p.y, p.x) + uRayRotation;
    float rc = max(cfg.rayCount, 1.0);
    float sharpExp = mix(4.0, 128.0, cfg.raySharp);
    float r1 = pow(abs(cos(angle * rc * 0.5)), sharpExp);
    float r2 = pow(abs(cos(angle * rc)),       sharpExp) * 0.6;
    float r3 = pow(abs(cos(angle * rc * 2.0)), sharpExp) * 0.3;
    float rays = r1 + r2 + r3;
    rays *= exp(-dist / max(cfg.rayLen * 0.5, 0.001));
    rays *= smoothstep(0.0, 0.02, dist);
    flare += rays * cfg.rayStr * cfg.color;
  }

  // Ghosts
  if (cfg.ghostStr > 0.001) {
    int ghosts = int(clamp(cfg.ghostCount, 0.0, 12.0));
    for (int i = 0; i < 12; i++) {
      if (i >= ghosts) break;
      float fi = float(i) + 1.0;
      float t = -1.0 + (fi / (float(ghosts) + 1.0)) * 2.0 * cfg.ghostSpacing;
      vec2 ghostPos = vec2(0.5, 0.5) + flareAxis * t;
      vec2 gp = (uv - ghostPos) * vec2(aspect, 1.0);

      float size = cfg.ghostSize * (0.3 + 0.7 * fract(fi * 0.37));
      float shape = mod(fi, 2.0) < 1.0
        ? hexagon(gp, size)
        : disk(gp, size, 0.6);

      vec3 ghostCol;
      if (cfg.ghostDisp > 0.001) {
        float d = cfg.ghostDisp * 0.02;
        vec2 dir = normalize(gp + 1e-5);
        float rC = mod(fi, 2.0) < 1.0
          ? hexagon(gp + dir * d, size)
          : disk(gp + dir * d, size, 0.6);
        float bC = mod(fi, 2.0) < 1.0
          ? hexagon(gp - dir * d, size)
          : disk(gp - dir * d, size, 0.6);
        ghostCol = vec3(rC, shape, bC);
      } else {
        ghostCol = vec3(shape);
      }

      vec3 tint = mix(cfg.color, spectrum(fi * 0.17 + 0.1), cfg.ghostDisp * 0.5);
      vec2 outOfFrame = abs(ghostPos - 0.5);
      float frameMask = 1.0 - smoothstep(0.55, 0.9, max(outOfFrame.x, outOfFrame.y));
      flare += ghostCol * tint * cfg.ghostStr * frameMask * 0.7;
    }
  }

  // Iris ring
  if (cfg.irisStr > 0.001) {
    float r = cfg.irisR;
    float ringDist = abs(dist - r);
    float ring = exp(-ringDist * ringDist / 0.0008);
    float ang = atan(p.y, p.x) / 6.283 + 0.5;
    vec3 ringCol = spectrum(ang);
    flare += ring * ringCol * cfg.irisStr;
  }

  flare *= uIntensity * edgeFade;

  vec3 result;
  if (uBlendMode > 0.5) {
    vec3 a = saturate(src.rgb);
    vec3 b = saturate(flare);
    result = 1.0 - (1.0 - a) * (1.0 - b);
    result += max(flare - 1.0, 0.0);
  } else {
    result = src.rgb + flare;
  }

  float outA = max(src.a, saturate(max(flare.r, max(flare.g, flare.b))));
  gl_FragColor = vec4(result, outA);
}`;

export const lensFlareEffect: EffectModule = {
  definition: def(
    'lensFlare',
    'Lens Flare',
    'generate',
    'Cinematic lens flare with preset styles + full custom control.',
    1,
    [
      param({ id: 'posX', name: 'Position X', value: 0.7, defaultValue: 0.7, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'posY', name: 'Position Y', value: 0.3, defaultValue: 0.3, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterY' }),

      param({ id: 'style', name: 'Style Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Sun / Golden Hour', value: 0 },
          { label: 'Anamorphic (JJ)',   value: 1 },
          { label: 'Starburst',         value: 2 },
          { label: 'Spectral Rainbow',  value: 3 },
          { label: 'Minimal / Subtle',  value: 4 },
          { label: 'Custom',            value: 5 },
        ], uniform: 'uStyle' }),
      param({ id: 'intensity',   name: 'Master Intensity', value: 1.0, defaultValue: 1.0, min: 0, max: 5, step: 0.05, uniform: 'uIntensity' }),
      param({ id: 'edgeFalloff', name: 'Edge Falloff',     value: 0.8, defaultValue: 0.8, min: 0, max: 5, step: 0.05, uniform: 'uEdgeFalloff' }),
      param({ id: 'rayRotation', name: 'Ray Rotation',     value: 0,   defaultValue: 0,   min: -3.14159, max: 3.14159, step: 0.01, uniform: 'uRayRotation' }),
      param({ id: 'blendMode',   name: 'Blend',            type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Add',    value: 0 },
          { label: 'Screen', value: 1 },
        ], uniform: 'uBlendMode' }),

      // -------- CUSTOM MODE PARAMS (only take effect when Style = Custom) --------
      param({ id: 'color',           name: '— Custom: Colour',        type: 'color', value: '#ffddaa', defaultValue: '#ffddaa', uniform: 'uColor' }),
      param({ id: 'coreSize',        name: '— Custom: Core Size',        value: 1.2, defaultValue: 1.2, min: 0.1, max: 10, step: 0.05, uniform: 'uCoreSize' }),
      param({ id: 'coreBrightness',  name: '— Custom: Core Brightness',  value: 2.0, defaultValue: 2.0, min: 0,   max: 10, step: 0.1,  uniform: 'uCoreBrightness' }),
      param({ id: 'haloSize',        name: '— Custom: Halo Size',        value: 0.5, defaultValue: 0.5, min: 0, max: 3, step: 0.05, uniform: 'uHaloSize' }),
      param({ id: 'haloStrength',    name: '— Custom: Halo Strength',    value: 0.6, defaultValue: 0.6, min: 0, max: 3, step: 0.05, uniform: 'uHaloStrength' }),
      param({ id: 'streakLength',    name: '— Custom: Streak Length',    value: 0.6, defaultValue: 0.6, min: 0, max: 3, step: 0.05, uniform: 'uStreakLength' }),
      param({ id: 'streakThickness', name: '— Custom: Streak Thickness', value: 1.0, defaultValue: 1.0, min: 0.1, max: 5, step: 0.05, uniform: 'uStreakThickness' }),
      param({ id: 'streakStrength',  name: '— Custom: Streak Strength',  value: 0.0, defaultValue: 0.0, min: 0, max: 3, step: 0.05, uniform: 'uStreakStrength' }),
      param({ id: 'rayCount',        name: '— Custom: Ray Count',        value: 6,   defaultValue: 6,   min: 2, max: 32, step: 1,    uniform: 'uRayCount' }),
      param({ id: 'raySharpness',    name: '— Custom: Ray Sharpness',    value: 0.7, defaultValue: 0.7, min: 0, max: 1, step: 0.01, uniform: 'uRaySharpness' }),
      param({ id: 'rayLength',       name: '— Custom: Ray Length',       value: 0.6, defaultValue: 0.6, min: 0.05, max: 3, step: 0.05, uniform: 'uRayLength' }),
      param({ id: 'rayStrength',     name: '— Custom: Ray Strength',     value: 0.8, defaultValue: 0.8, min: 0, max: 3, step: 0.05, uniform: 'uRayStrength' }),
      param({ id: 'ghostCount',      name: '— Custom: Ghost Count',      value: 6,   defaultValue: 6,   min: 0, max: 12, step: 1,   uniform: 'uGhostCount' }),
      param({ id: 'ghostSpacing',    name: '— Custom: Ghost Spacing',    value: 1.0, defaultValue: 1.0, min: 0.1, max: 2, step: 0.05, uniform: 'uGhostSpacing' }),
      param({ id: 'ghostSize',       name: '— Custom: Ghost Size',       value: 0.08, defaultValue: 0.08, min: 0.01, max: 0.3, step: 0.005, uniform: 'uGhostSize' }),
      param({ id: 'ghostStrength',   name: '— Custom: Ghost Strength',   value: 0.6, defaultValue: 0.6, min: 0, max: 3, step: 0.05, uniform: 'uGhostStrength' }),
      param({ id: 'ghostDispersion', name: '— Custom: Ghost Rainbow',    value: 0.5, defaultValue: 0.5, min: 0, max: 2, step: 0.05, uniform: 'uGhostDispersion' }),
      param({ id: 'irisRingRadius',  name: '— Custom: Iris Ring Radius', value: 0.15, defaultValue: 0.15, min: 0.02, max: 0.8, step: 0.01, uniform: 'uIrisRingRadius' }),
      param({ id: 'irisRingStrength', name: '— Custom: Iris Ring Strength', value: 0.0, defaultValue: 0.0, min: 0, max: 3, step: 0.05, uniform: 'uIrisRingStrength' }),
    ],
  ),
  fragmentShader: FLARE_FRAG,
};