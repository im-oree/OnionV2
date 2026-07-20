import type { EffectModule } from './types';
import { def, param } from './types';

export const hueSaturationEffect: EffectModule = {
  definition: def(
    'hueSaturation',
    'Hue/Saturation',
    'color',
    'Shift hue and adjust saturation.',
    1,
    [
      param({ id: 'hueShift', name: 'Hue Shift', type: 'angle', value: 0, defaultValue: 0, min: -180, max: 180, step: 1, uniform: 'uHueShift' }),
      param({ id: 'satFactor', name: 'Saturation', value: 1, defaultValue: 1, min: 0, max: 3, step: 0.05, uniform: 'uSatFactor' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform float uHueShift; uniform float uSatFactor;
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
      vec4 src = texture2D(uTexture, vUv);
      vec3 hsv = rgb2hsv(src.rgb);
      hsv.x += uHueShift / 360.0;
      hsv.y *= uSatFactor;
      gl_FragColor = vec4(hsv2rgb(hsv), src.a);
    }`,
};