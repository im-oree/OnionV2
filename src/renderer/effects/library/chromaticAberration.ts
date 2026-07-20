import type { EffectModule } from './types';
import { def, param } from './types';

export const chromaticAberrationEffect: EffectModule = {
  definition: def('chromaticAberration', 'Chromatic Aberration', 'stylize', 'Separates RGB channels.', 1, [
    param({ id: 'offset', name: 'Offset', value: 5, min: 0, max: 50, uniform: 'uOffset' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uOffset;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 shift = vec2(uOffset) / uResolution;
      float r = texture2D(uTexture, vUv + shift).r;
      float g = texture2D(uTexture, vUv).g;
      float b = texture2D(uTexture, vUv - shift).b;
      gl_FragColor = vec4(r, g, b, texture2D(uTexture, vUv).a);
    }`,
};
