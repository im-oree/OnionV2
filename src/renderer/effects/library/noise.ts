import type { EffectModule } from './types';
import { def, param } from './types';

export const noiseEffect: EffectModule = {
  definition: def('noise', 'Noise', 'generate', 'Adds random grain.', 1, [
    param({ id: 'amount', name: 'Amount', value: 10, min: 0, max: 100, uniform: 'uAmount' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 col = texture2D(uTexture, vUv);
      float n = (rand(vUv + uTime) - 0.5) * (uAmount / 100.0);
      gl_FragColor = vec4(col.rgb + n, col.a);
    }`,
};
