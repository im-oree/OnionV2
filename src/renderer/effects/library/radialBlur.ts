import type { EffectModule } from './types';
import { def, param } from './types';

export const radialBlurEffect: EffectModule = {
  definition: def(
    'radialBlur',
    'Radial Blur',
    'blur',
    'Blur radiating from a center point (zoom blur).',
    1,
    [
      param({ id: 'amount', name: 'Amount', value: 10, defaultValue: 10, min: 0, max: 100, step: 0.5, uniform: 'uAmount' }),
      param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5] as [number, number], defaultValue: [0.5, 0.5] as [number, number], step: 0.01, uniform: 'uCenter' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform float uAmount; uniform vec2 uCenter;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - uCenter;
      vec4 col = vec4(0.0);
      const int SAMPLES = 12;
      float amt = uAmount / 100.0;
      for (int i = 0; i < SAMPLES; i++) {
        float t = float(i) / float(SAMPLES - 1);
        float scale = 1.0 - amt * t;
        col += texture2D(uTexture, uCenter + dir * scale);
      }
      gl_FragColor = col / float(SAMPLES);
    }`,
};