import type { EffectModule } from './types';
import { def } from './types';

export const invertEffect: EffectModule = {
  definition: def(
    'invert',
    'Invert',
    'color',
    'Invert RGB colors.',
    1,
    [],
  ),
  fragmentShader: `uniform sampler2D uTexture; varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      gl_FragColor = vec4(1.0 - src.rgb, src.a);
    }`,
};