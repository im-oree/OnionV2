import type { EffectModule } from './types';
import { def, param } from './types';

export const fillEffect: EffectModule = {
  definition: def(
    'fill',
    'Fill',
    'color',
    'Blend a solid color over the source using opacity.',
    1,
    [
      param({ id: 'fillColor', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uFillColor' }),
      param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 100, defaultValue: 100, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform vec3 uFillColor; uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float o = uOpacity / 100.0;
      gl_FragColor = vec4(mix(src.rgb, uFillColor, o), src.a);
    }`,
};