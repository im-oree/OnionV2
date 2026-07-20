import type { EffectModule } from './types';
import { def, param } from './types';

export const sharpenEffect: EffectModule = {
  definition: def('sharpen', 'Sharpen', 'blur', 'Enhances edges.', 1, [
    param({ id: 'amount', name: 'Amount', value: 1, min: 0, max: 5, step: 0.1, uniform: 'uAmount' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAmount;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 res = 1.0 / uResolution;
      vec4 center = texture2D(uTexture, vUv);
      vec4 up = texture2D(uTexture, vUv + vec2(0, res.y));
      vec4 down = texture2D(uTexture, vUv - vec2(0, res.y));
      vec4 left = texture2D(uTexture, vUv - vec2(res.x, 0));
      vec4 right = texture2D(uTexture, vUv + vec2(res.x, 0));
      vec4 edge = center * 5.0 - (up + down + left + right);
      gl_FragColor = mix(center, edge, uAmount);
    }`,
};
