import type { EffectModule } from './types';
import { def, param } from './types';

export const directionalBlurEffect: EffectModule = {
  definition: def(
    'directionalBlur',
    'Directional Blur',
    'blur',
    'Motion blur along a given angle.',
    1,
    [
      param({ id: 'angle', name: 'Angle', type: 'angle', value: 45, defaultValue: 45, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
      param({ id: 'distance', name: 'Distance', value: 20, defaultValue: 20, min: 0, max: 200, step: 1, uniform: 'uDistance' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform float uAngle; uniform float uDistance;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      float a = radians(uAngle);
      vec2 dir = vec2(cos(a), sin(a)) * uDistance / uResolution;
      vec4 col = vec4(0.0);
      const int SAMPLES = 12;
      for (int i = -SAMPLES; i <= SAMPLES; i++) {
        float t = float(i) / float(SAMPLES);
        col += texture2D(uTexture, vUv + dir * t);
      }
      gl_FragColor = col / float(SAMPLES * 2 + 1);
    }`,
};