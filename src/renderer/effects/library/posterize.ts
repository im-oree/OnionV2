import type { EffectModule } from './types';
import { def, param } from './types';

export const posterizeEffect: EffectModule = {
  definition: def('posterize', 'Posterize', 'color', 'Reduces number of colour levels.', 1, [
    param({ id: 'levels', name: 'Levels', value: 4, min: 2, max: 32, step: 1, uniform: 'uLevels' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uLevels;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 col = floor(src.rgb * uLevels) / (uLevels - 1.0);
      gl_FragColor = vec4(col, src.a);
    }`,
};
