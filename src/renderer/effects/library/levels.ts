import type { EffectModule } from './types';
import { def, param } from './types';

export const levelsEffect: EffectModule = {
  definition: def(
    'levels',
    'Levels',
    'color',
    'Input/output black+white levels with gamma.',
    1,
    [
      param({ id: 'inputBlack', name: 'Input Black', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uInputBlack' }),
      param({ id: 'inputWhite', name: 'Input White', value: 1, defaultValue: 1, min: 0, max: 1, step: 0.01, uniform: 'uInputWhite' }),
      param({ id: 'gamma', name: 'Gamma', value: 1, defaultValue: 1, min: 0.1, max: 3, step: 0.05, uniform: 'uGamma' }),
      param({ id: 'outputBlack', name: 'Output Black', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uOutputBlack' }),
      param({ id: 'outputWhite', name: 'Output White', value: 1, defaultValue: 1, min: 0, max: 1, step: 0.01, uniform: 'uOutputWhite' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture;
    uniform float uInputBlack; uniform float uInputWhite; uniform float uGamma;
    uniform float uOutputBlack; uniform float uOutputWhite;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 c = src.rgb;
      c = (c - uInputBlack) / max(uInputWhite - uInputBlack, 0.001);
      c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.01)));
      c = c * (uOutputWhite - uOutputBlack) + uOutputBlack;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
    }`,
};