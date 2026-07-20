import type { EffectModule } from './types';
import { def, param } from './types';

export const crossHatchEffect: EffectModule = {
  definition: def('crossHatch', 'Cross Hatch', 'stylize',
    'Pencil-sketch cross-hatching from luminance.', 1, [
    param({ id: 'spacing', name: 'Spacing',   value: 10,  min: 2, max: 40, step: 1,   uniform: 'uSpacing' }),
    param({ id: 'thick',   name: 'Thickness', value: 1.0, min: 0.1, max: 3, step: 0.1, uniform: 'uThick' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uSpacing;
    uniform float uThick;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      vec3 col = vec3(1.0);
      vec2 p = vUv * uResolution / uSpacing;
      if (lum < 1.00 && mod(p.x + p.y, 1.0) < uThick * 0.15) col = vec3(0.0);
      if (lum < 0.75 && mod(p.x - p.y, 1.0) < uThick * 0.15) col = vec3(0.0);
      if (lum < 0.50 && mod(p.x + p.y - 0.5, 1.0) < uThick * 0.15) col = vec3(0.0);
      if (lum < 0.25 && mod(p.x - p.y - 0.5, 1.0) < uThick * 0.15) col = vec3(0.0);
      gl_FragColor = vec4(col, src.a);
    }`,
};
