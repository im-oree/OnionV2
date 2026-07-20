import type { EffectModule } from './types';
import { def, param } from './types';

export const tintEffect: EffectModule = {
  definition: def(
    'tint',
    'Tint',
    'color',
    'Map shadows to color A and highlights to color B.',
    1,
    [
      param({ id: 'colorA', name: 'Shadow Color', type: 'color', value: '#0000ff', defaultValue: '#0000ff', uniform: 'uColorA' }),
      param({ id: 'colorB', name: 'Highlight Color', type: 'color', value: '#ffaa00', defaultValue: '#ffaa00', uniform: 'uColorB' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform vec3 uColorA; uniform vec3 uColorB;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      vec3 tinted = mix(uColorA, uColorB, lum);
      gl_FragColor = vec4(tinted, src.a);
    }`,
};