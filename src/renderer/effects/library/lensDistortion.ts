import type { EffectModule } from './types';
import { def, param } from './types';

export const lensDistortionEffect: EffectModule = {
  definition: def('lensDistortion', 'Lens Distortion', 'distort', 'Barrel (+) or pincushion (-) lens warp.', 1, [
    param({ id: 'k1', name: 'Distortion', value: 0.2, min: -1, max: 1, step: 0.01, uniform: 'uK1' }),
    param({ id: 'k2', name: 'Distortion 2', value: 0.0, min: -1, max: 1, step: 0.01, uniform: 'uK2' }),
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5] as [number, number], defaultValue: [0.5, 0.5] as [number, number], step: 0.01, uniform: 'uCenter' }),
    param({ id: 'scale', name: 'Scale', value: 1.0, min: 0.5, max: 2, step: 0.01, uniform: 'uScale' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uK1;
    uniform float uK2;
    uniform vec2 uCenter;
    uniform float uScale;
    varying vec2 vUv;
    void main() {
      vec2 xy = (vUv - uCenter) / uScale;
      float r2 = dot(xy, xy);
      float r4 = r2 * r2;
      vec2 warp = xy * (1.0 + uK1 * r2 + uK2 * r4);
      vec2 uv = warp + uCenter;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0);
      } else {
        gl_FragColor = texture2D(uTexture, uv);
      }
    }`,
};
