import type { EffectModule } from './types';
import { def, param } from './types';

export const mirrorEffect: EffectModule = {
  definition: def('mirror', 'Mirror', 'distort', 'Reflects the frame along an axis.', 1, [
    param({ id: 'center', name: 'Center', value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenter' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uCenter;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      if (uv.x > uCenter) uv.x = 2.0 * uCenter - uv.x;
      gl_FragColor = texture2D(uTexture, clamp(uv, 0.0, 1.0));
    }`,
};
