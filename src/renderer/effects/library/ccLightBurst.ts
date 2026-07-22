import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;

uniform float uCenterX;
uniform float uCenterY;

uniform float uIntensity;
uniform float uRayLength;
uniform float uFalloff;
uniform float uThreshold;
uniform float uSoftKnee;

uniform float uSamples;
uniform float uDither;

uniform vec3  uTint;
uniform float uUseSourceColor;
uniform float uSaturation;

uniform float uCoreBrightness;
uniform float uCoreSize;
uniform vec3  uCoreColor;

uniform float uAutoAnimate;
uniform float uAnimSpeed;
uniform float uRayRotation;

uniform float uBlendMode;
uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
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

vec3 brightExtract(vec3 c, float thresh, float knee) {
  float lum = luma(c);
  float k = max(knee, 1e-4);
  float soft = clamp(lum - thresh + k, 0.0, 2.0 * k);
  soft = soft * soft / (4.0 * k);
  float mask = clamp(max(soft, lum - thresh), 0.0, 1.5);
  return c * mask;
}

struct Cfg {
  float intensity;
  float rayLength;
  float falloff;
  float threshold;
  float softKnee;
  float samples;
  float dither;
  vec3  tint;
  float useSource;
  float saturation;
  float coreBrightness;
  float coreSize;
  vec3  coreColor;
};

Cfg presetSunburst() {
  return Cfg(1.8, 0.6, 1.2, 0.5, 0.4, 32.0, 0.4, vec3(1.0, 0.85, 0.5), 1.0, 1.3,
             1.5, 0.05, vec3(1.0, 0.9, 0.7));
}
Cfg presetGodRays() {
  return Cfg(2.2, 0.8, 0.8, 0.45, 0.5, 48.0, 0.5, vec3(1.0, 0.95, 0.85), 1.0, 1.15,
             0.8, 0.08, vec3(1.0, 0.95, 0.85));
}
Cfg presetHolyLight() {
  return Cfg(2.5, 1.0, 0.5, 0.4, 0.6, 48.0, 0.6, vec3(1.0), 0.3, 1.0,
             2.5, 0.12, vec3(1.0));
}
Cfg presetLensBurst() {
  return Cfg(2.0, 0.5, 1.5, 0.6, 0.3, 32.0, 0.3, vec3(1.0, 0.95, 0.85), 0.7, 1.4,
             2.0, 0.06, vec3(1.0));
}
Cfg presetPortalGlow() {
  return Cfg(2.2, 0.7, 1.0, 0.35, 0.5, 40.0, 0.5, vec3(0.3, 0.9, 1.0), 0.0, 1.3,
             2.0, 0.1, vec3(0.4, 1.0, 1.0));
}
Cfg presetExplosion() {
  return Cfg(3.0, 0.9, 1.4, 0.35, 0.4, 40.0, 0.4, vec3(1.0, 0.55, 0.15), 0.4, 1.5,
             3.5, 0.08, vec3(1.0, 0.75, 0.3));
}
Cfg presetSubtle() {
  return Cfg(0.7, 0.4, 1.5, 0.6, 0.3, 24.0, 0.3, vec3(1.0, 0.95, 0.85), 1.0, 1.1,
             0.5, 0.05, vec3(1.0, 0.95, 0.85));
}
Cfg presetCustom() {
  return Cfg(uIntensity, uRayLength, uFalloff, uThreshold, uSoftKnee,
             uSamples, uDither, uTint, uUseSourceColor, uSaturation,
             uCoreBrightness, uCoreSize, uCoreColor);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetSunburst();
  if (s == 1) return presetGodRays();
  if (s == 2) return presetHolyLight();
  if (s == 3) return presetLensBurst();
  if (s == 4) return presetPortalGlow();
  if (s == 5) return presetExplosion();
  if (s == 6) return presetSubtle();
  return presetCustom();
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  vec2 center = vec2(uCenterX, uCenterY);
  vec2 delta = vUv - center;
  float dist = length(delta);

  // Direction from pixel toward center (we march AWAY from center to gather)
  vec2 dirToCenter = -delta;

  // Optional rotation offset applied to the sample direction
  float rot = uRayRotation;
  if (uAutoAnimate > 0.5) {
    rot += uTime * uAnimSpeed * 0.3;
  }
  if (abs(rot) > 1e-4) {
    float c = cos(rot), s = sin(rot);
    dirToCenter = mat2(c, -s, s, c) * dirToCenter;
  }

  // ---- Radial march: sample from this pixel toward center, gathering bright pixels ----
  int samples = int(clamp(cfg.samples, 8.0, 64.0));
  float fSamples = float(samples);
  float stepLen = cfg.rayLength / fSamples;

  // Jitter to hide banding
  float jitter = (hash(vUv * uResolution.xy) - 0.5) * cfg.dither;

  vec3 accum = vec3(0.0);
  float weight = 1.0;
  float totalW = 0.0;

  for (int i = 0; i < 64; i++) {
    if (i >= samples) break;
    float ft = (float(i) + jitter) / fSamples;
    // Sample position: from this pixel, march toward center
    vec2 sampleUv = vUv + dirToCenter * ft * cfg.rayLength;
    sampleUv = clamp(sampleUv, 0.0, 1.0);

    vec3 s = texture2D(uTexture, sampleUv).rgb;
    vec3 bright = brightExtract(s, cfg.threshold, cfg.softKnee);

    accum += bright * weight;
    totalW += weight;
    weight *= (1.0 - cfg.falloff / fSamples * 2.0);
    weight = max(weight, 0.0);
  }

  vec3 rays = accum / max(totalW, 0.001);
  rays *= cfg.intensity;

  // Apply tint OR use source color
  if (cfg.useSource < 0.5) {
    float rayLum = luma(rays);
    rays = cfg.tint * rayLum;
  } else {
    // Boost saturation slightly for punchier rays
    vec3 hsv = rgb2hsv(rays);
    hsv.y = clamp(hsv.y * cfg.saturation, 0.0, 1.5);
    rays = hsv2rgb(hsv);
  }

  // ---- Core glow at center ----
  vec3 coreCol = vec3(0.0);
  if (cfg.coreBrightness > 0.001) {
    float coreDist = dist;
    float core = exp(-coreDist * coreDist / max(cfg.coreSize * cfg.coreSize, 1e-4));
    coreCol = cfg.coreColor * core * cfg.coreBrightness;
  }

  vec3 lightContrib = rays + coreCol;

  // ---- Blend ----
  vec3 result;
  int blend = int(uBlendMode + 0.5);
  if (blend == 0) {
    // Screen (natural rays over image)
    vec3 a = clamp(src.rgb, 0.0, 1.0);
    vec3 b = clamp(lightContrib, 0.0, 1.0);
    result = 1.0 - (1.0 - a) * (1.0 - b);
    result += max(lightContrib - 1.0, 0.0);
  } else if (blend == 1) {
    // Add (punchier)
    result = src.rgb + lightContrib;
  } else if (blend == 2) {
    // Lighten
    result = max(src.rgb, lightContrib);
  } else {
    // Rays only (transparent bg for compositing)
    float lm = clamp(max(lightContrib.r, max(lightContrib.g, lightContrib.b)), 0.0, 1.0);
    gl_FragColor = vec4(lightContrib, lm * clamp(uMix, 0.0, 1.0));
    return;
  }

  vec3 final = mix(src.rgb, result, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(clamp(final, 0.0, 2.0), src.a);
}
`;

export const ccLightBurstEffect: EffectModule = {
  definition: def(
    'ccLightBurst',
    'CC Light Burst',
    'generate',
    'Radial zoom-blur light rays emanating from a center point. 7 burst styles.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Burst Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Sunburst',      value: 0 },
          { label: 'God Rays',      value: 1 },
          { label: 'Holy Light',    value: 2 },
          { label: 'Lens Burst',    value: 3 },
          { label: 'Portal Glow',   value: 4 },
          { label: 'Explosion',     value: 5 },
          { label: 'Subtle',        value: 6 },
          { label: 'Custom',        value: 7 },
        ], uniform: 'uStyle' }),

      // ===== POSITION =====
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterY' }),

      // ===== ANIMATION =====
      param({ id: 'autoAnimate', name: 'Auto Rotate', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoAnimate' }),
      param({ id: 'animSpeed',   name: 'Rotation Speed', value: 1.0, defaultValue: 1.0, min: -5, max: 5, step: 0.05, uniform: 'uAnimSpeed' }),
      param({ id: 'rayRotation', name: 'Ray Rotation (rad)', value: 0, defaultValue: 0, min: -3.14159, max: 3.14159, step: 0.01, uniform: 'uRayRotation' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'blendMode', name: 'Blend Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Screen',     value: 0 },
          { label: 'Add',        value: 1 },
          { label: 'Lighten',    value: 2 },
          { label: 'Rays Only',  value: 3 },
        ], uniform: 'uBlendMode' }),

      // ===== CUSTOM: Ray physics =====
      param({ id: 'intensity',  name: 'Custom: Intensity',  value: 1.8, defaultValue: 1.8, min: 0, max: 8, step: 0.05, uniform: 'uIntensity' }),
      param({ id: 'rayLength',  name: 'Custom: Ray Length', value: 0.6, defaultValue: 0.6, min: 0.05, max: 2, step: 0.02, uniform: 'uRayLength' }),
      param({ id: 'falloff',    name: 'Custom: Ray Falloff', value: 1.2, defaultValue: 1.2, min: 0, max: 4, step: 0.05, uniform: 'uFalloff' }),
      param({ id: 'samples',    name: 'Custom: Quality (Samples)', value: 32, defaultValue: 32, min: 8, max: 64, step: 1, uniform: 'uSamples' }),
      param({ id: 'dither',     name: 'Custom: Dither',     value: 0.4, defaultValue: 0.4, min: 0, max: 2, step: 0.05, uniform: 'uDither' }),

      // ===== CUSTOM: Bright pass =====
      param({ id: 'threshold',  name: 'Custom: Highlight Threshold', value: 0.5, defaultValue: 0.5, min: 0, max: 1.5, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'softKnee',   name: 'Custom: Threshold Soft Knee', value: 0.4, defaultValue: 0.4, min: 0.01, max: 1, step: 0.01, uniform: 'uSoftKnee' }),

      // ===== CUSTOM: Color =====
      param({ id: 'useSourceColor', name: 'Custom: Use Source Color', type: 'boolean', value: true, defaultValue: true, uniform: 'uUseSourceColor' }),
      param({ id: 'tint',           name: 'Custom: Ray Tint',         type: 'color', value: '#ffdd88', defaultValue: '#ffdd88', uniform: 'uTint' }),
      param({ id: 'saturation',     name: 'Custom: Ray Saturation',   value: 1.3, defaultValue: 1.3, min: 0, max: 3, step: 0.05, uniform: 'uSaturation' }),

      // ===== CUSTOM: Core glow =====
      param({ id: 'coreBrightness', name: 'Custom: Core Brightness', value: 1.5, defaultValue: 1.5, min: 0, max: 10, step: 0.05, uniform: 'uCoreBrightness' }),
      param({ id: 'coreSize',       name: 'Custom: Core Size',       value: 0.05, defaultValue: 0.05, min: 0.005, max: 0.5, step: 0.005, uniform: 'uCoreSize' }),
      param({ id: 'coreColor',      name: 'Custom: Core Color',      type: 'color', value: '#ffedb8', defaultValue: '#ffedb8', uniform: 'uCoreColor' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};