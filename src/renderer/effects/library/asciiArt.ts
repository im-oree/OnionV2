import type { EffectModule } from './types';
import { def, param } from './types';

export const asciiArtEffect: EffectModule = {
  definition: def('asciiArt', 'ASCII Art', 'stylize',
    'Renders the image as coarse luminance cells resembling text art.', 1, [
    param({ id: 'cellSize', name: 'Cell Size', value: 8, min: 4, max: 32, step: 1, uniform: 'uCellSize' }),
    param({ id: 'contrast', name: 'Contrast',  value: 1.2, min: 0.5, max: 3, step: 0.1, uniform: 'uContrast' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uCellSize;
    uniform float uContrast;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec2 cells = uResolution / uCellSize;
      vec2 cellUv = floor(vUv * cells) / cells + 0.5 / cells;
      vec4 src = texture2D(uTexture, cellUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      lum = clamp((lum - 0.5) * uContrast + 0.5, 0.0, 1.0);
      vec2 sub = fract(vUv * cells) - 0.5;
      float d = length(sub);
      float mask = step(d, lum * 0.6);
      vec3 col = vec3(mask);
      gl_FragColor = vec4(col, src.a);
    }`,
};
