import type { EffectModule } from './types';
import { def, param } from './types';

export const vignetteEffect: EffectModule = {
  definition: def('vignette', 'Vignette', 'stylize', 'Darkened edges, cinematic look.', 1, [
    param({ id: 'amount', name: 'Amount', value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uAmount' }),
    param({ id: 'smoothness', name: 'Smoothness', value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uSmoothness' }),
    param({ id: 'color', name: 'Color', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColor' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAmount;
    uniform float uSmoothness;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 uv = vUv * 2.0 - 1.0;
      float dist = length(uv);
      float vignette = smoothstep(1.0 - uSmoothness, 1.0, dist * (1.0 + uAmount));
      gl_FragColor = vec4(mix(src.rgb, uColor, vignette), src.a);
    }`,
};
