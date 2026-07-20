import type { EffectModule } from './types';
import { def, param } from './types';

export const tritoneEffect: EffectModule = {
  definition: def('tritone', 'Tritone', 'color', 'Map shadows, midtones, highlights to separate colors.', 1, [
    param({ id: 'shadows', name: 'Shadows', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uShadows' }),
    param({ id: 'midtones', name: 'Midtones', type: 'color', value: '#888888', defaultValue: '#888888', uniform: 'uMidtones' }),
    param({ id: 'highlights', name: 'Highlights', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uHighlights' }),
    param({ id: 'blend', name: 'Blend', value: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uBlend' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3 uShadows;
    uniform vec3 uMidtones;
    uniform vec3 uHighlights;
    uniform float uBlend;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      vec3 col;
      if (lum < 0.5) {
        col = mix(uShadows, uMidtones, lum * 2.0);
      } else {
        col = mix(uMidtones, uHighlights, (lum - 0.5) * 2.0);
      }
      gl_FragColor = vec4(mix(src.rgb, col, uBlend), src.a);
    }`,
};
