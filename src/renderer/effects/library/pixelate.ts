import type { EffectModule } from './types';
import { def, param } from './types';

export const pixelateEffect: EffectModule = {
  definition: def('pixelate', 'Pixelate', 'distort', 'Mosaic / pixel art effect.', 1, [
    param({ id: 'size', name: 'Block Size', value: 10, min: 1, max: 128, step: 1, uniform: 'uSize' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uSize;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 blocks = uResolution / uSize;
      vec2 uv = floor(vUv * blocks) / blocks + 0.5 / blocks;
      gl_FragColor = texture2D(uTexture, uv);
    }`,
};
