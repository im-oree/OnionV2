import type { EffectModule } from './types';
import { def, param } from './types';

export const colorCorrectionEffect: EffectModule = {
  definition: def(
    'colorCorrection',
    'Color Correction',
    'color',
    'Brightness, contrast, saturation, hue, gamma.',
    1,
    [
      param({ id: 'brightness', name: 'Brightness', value: 0, defaultValue: 0, min: -100, max: 100, step: 1, uniform: 'uBrightness' }),
      param({ id: 'contrast', name: 'Contrast', value: 0, defaultValue: 0, min: -100, max: 100, step: 1, uniform: 'uContrast' }),
      param({ id: 'saturation', name: 'Saturation', value: 0, defaultValue: 0, min: -100, max: 100, step: 1, uniform: 'uSaturation' }),
      param({ id: 'hue', name: 'Hue', type: 'angle', value: 0, defaultValue: 0, min: -180, max: 180, step: 1, uniform: 'uHue' }),
      param({ id: 'gamma', name: 'Gamma', value: 1, defaultValue: 1, min: 0.1, max: 3, step: 0.05, uniform: 'uGamma' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture;
    uniform float uBrightness; uniform float uContrast; uniform float uSaturation; uniform float uHue; uniform float uGamma;
    varying vec2 vUv;
    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    void main() {
      vec4 col = texture2D(uTexture, vUv);
      col.rgb = pow(max(col.rgb, 0.0), vec3(1.0 / max(uGamma, 0.01)));
      col.rgb = (col.rgb - 0.5) * (1.0 + uContrast / 100.0) + 0.5;
      col.rgb += uBrightness / 100.0;
      vec3 hsv = rgb2hsv(col.rgb);
      hsv.x += uHue / 360.0;
      hsv.y *= (1.0 + uSaturation / 100.0);
      col.rgb = hsv2rgb(hsv);
      gl_FragColor = col;
    }`,
};