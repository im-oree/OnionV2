import type { EffectModule } from './types';
import { def, param } from './types';

export const duotoneEffect: EffectModule = {
  definition: def('duotone', 'Duotone', 'color',
    'Map luminance to a colour ramp between two colours.', 1, [
    param({ id: 'dark',  name: 'Dark',  type: 'color', value: '#1a1a3a', defaultValue: '#1a1a3a', uniform: 'uDark' }),
    param({ id: 'light', name: 'Light', type: 'color', value: '#ffde5c', defaultValue: '#ffde5c', uniform: 'uLight' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3 uDark;
    uniform vec3 uLight;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(mix(uDark, uLight, lum), src.a);
    }`,
};
