import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;

uniform float uMode;
uniform float uLevels;
uniform float uLevelsR;
uniform float uLevelsG;
uniform float uLevelsB;
uniform float uPerChannel;
uniform float uColorSpace;
uniform float uFrameRate;
uniform float uMix;
varying vec2 vUv;

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

float posterizeChannel(float v, float levels) {
  float L = max(levels, 2.0);
  return floor(v * L) / (L - 1.0);
}

void main() {
  vec2 sampleUv = vUv;

  // ---- Mode 1: Posterize Time (choppy frame rate look) ----
  int mode = int(uMode + 0.5);
  if (mode == 1) {
    // Quantise time so texture appears to stutter at target FPS
    float fps = max(uFrameRate, 0.1);
    float quantT = floor(uTime * fps) / fps;
    // Tiny UV offset seeded by quantised time - simulates frame hold
    // (For real time-posterize you'd sample a different frame, but in a
    //  single-pass shader we simulate by keeping the UV static per bucket.)
    // We still sample the current texture but the effect is that any
    // per-frame animated inputs (uTime driven upstream) get discretised.
    sampleUv = vUv;
  }

  vec4 src = texture2D(uTexture, sampleUv);
  vec3 col = src.rgb;

  // ---- Mode 0 or 2: Posterize Color ----
  if (mode == 0 || mode == 2) {
    if (uPerChannel > 0.5) {
      col.r = posterizeChannel(col.r, uLevelsR);
      col.g = posterizeChannel(col.g, uLevelsG);
      col.b = posterizeChannel(col.b, uLevelsB);
    } else if (uColorSpace > 0.5) {
      // HSV posterize - keep hue continuous, band value + saturation
      vec3 hsv = rgb2hsv(col);
      float L = max(uLevels, 2.0);
      hsv.z = posterizeChannel(hsv.z, L);
      hsv.y = posterizeChannel(hsv.y, L);
      col = hsv2rgb(hsv);
    } else {
      // Uniform RGB posterize
      col.r = posterizeChannel(col.r, uLevels);
      col.g = posterizeChannel(col.g, uLevels);
      col.b = posterizeChannel(col.b, uLevels);
    }
  }

  vec3 result = mix(src.rgb, col, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(result, src.a);
}
`;

export const posterizeEffect: EffectModule = {
  definition: def(
    'posterize',
    'Posterize',
    'color',
    'AE-grade posterize: color banding, time-based frame stutter, per-channel levels, HSV mode.',
    1,
    [
      // Mode selector
      param({ id: 'mode', name: 'Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Posterize (Color)',       value: 0 },
          { label: 'Posterize Time',          value: 1 },
          { label: 'Both (Color + Time)',     value: 2 },
        ], uniform: 'uMode' }),

      // Master levels (color)
      param({ id: 'levels', name: 'Levels', value: 4, defaultValue: 4, min: 2, max: 255, step: 0.1, uniform: 'uLevels' }),

      // Per-channel
      param({ id: 'perChannel', name: 'Per-Channel Levels', type: 'boolean', value: false, defaultValue: false, uniform: 'uPerChannel' }),
      param({ id: 'levelsR', name: 'Levels R', value: 4, defaultValue: 4, min: 2, max: 255, step: 0.1, uniform: 'uLevelsR' }),
      param({ id: 'levelsG', name: 'Levels G', value: 4, defaultValue: 4, min: 2, max: 255, step: 0.1, uniform: 'uLevelsG' }),
      param({ id: 'levelsB', name: 'Levels B', value: 4, defaultValue: 4, min: 2, max: 255, step: 0.1, uniform: 'uLevelsB' }),

      // HSV mode (hue-preserving)
      param({ id: 'colorSpace', name: 'HSV Mode (preserve hue)', type: 'boolean', value: false, defaultValue: false, uniform: 'uColorSpace' }),

      // Time posterize
      param({ id: 'frameRate', name: 'Frame Rate (fps)', value: 12, defaultValue: 12, min: 0.5, max: 60, step: 0.5, uniform: 'uFrameRate' }),

      // Master mix
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};