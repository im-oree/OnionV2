import type { EffectModule } from './types';
import { def, param } from './types';

export const bulgeEffect: EffectModule = {
  definition: def('bulge', 'Bulge', 'distort', 'Magnifies or pinches an area.', 1, [
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5], uniform: 'uCenter' }),
    param({ id: 'radius', name: 'Radius', value: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uRadius' }),
    param({ id: 'amount', name: 'Amount', value: 0.5, min: -1, max: 1, step: 0.01, uniform: 'uAmount' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - uCenter;
      float dist = length(dir);
      vec2 uv = vUv;
      if (dist < uRadius) {
        float percent = dist / uRadius;
        if (uAmount > 0.0) {
          uv = uCenter + dir * pow(percent, 1.0 + uAmount);
        } else {
          uv = uCenter + dir * pow(percent, 1.0 / (1.0 - uAmount));
        }
      }
      gl_FragColor = texture2D(uTexture, uv);
    }`,
};
