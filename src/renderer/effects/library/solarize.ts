import type { EffectModule } from './types';
import { def, param } from './types';

export const solarizeEffect: EffectModule = {
  definition: def('solarize', 'Solarize', 'color',
    'Photographic solarize — invert colours above threshold.', 1, [
    param({ id: 'threshold', name: 'Threshold', value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
    param({ id: 'smooth',    name: 'Smoothness',value: 0.02, min: 0, max: 0.5, step: 0.01, uniform: 'uSmooth' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uThreshold;
    uniform float uSmooth;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 t = vec3(uThreshold);
      vec3 sm = vec3(uSmooth);
      vec3 mixv = smoothstep(t - sm, t + sm, src.rgb);
      gl_FragColor = vec4(mix(src.rgb, 1.0 - src.rgb, mixv), src.a);
    }`,
};
