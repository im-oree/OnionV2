import type { EffectModule } from './types';
import { def, param } from './types';

export const sepiaEffect: EffectModule = {
  definition: def('sepia', 'Sepia', 'color',
    'Warm brown vintage photo tone.', 1, [
    param({ id: 'amount', name: 'Amount', value: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uAmount' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 s;
      s.r = dot(src.rgb, vec3(0.393, 0.769, 0.189));
      s.g = dot(src.rgb, vec3(0.349, 0.686, 0.168));
      s.b = dot(src.rgb, vec3(0.272, 0.534, 0.131));
      gl_FragColor = vec4(mix(src.rgb, s, uAmount), src.a);
    }`,
};
