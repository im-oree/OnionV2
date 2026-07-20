import type { EffectModule } from './types';
import { def, param } from './types';

export const filmGrainEffect: EffectModule = {
  definition: def('filmGrain', 'Film Grain', 'stylize',
    'Cinematic grain with adjustable size and colour.', 1, [
    param({ id: 'intensity',  name: 'Intensity',  value: 0.15, min: 0, max: 1, step: 0.01, uniform: 'uIntensity' }),
    param({ id: 'size',       name: 'Grain Size', value: 1.5,  min: 0.5, max: 5, step: 0.1, uniform: 'uSize' }),
    param({ id: 'speed',      name: 'Speed',      value: 30,   min: 0, max: 120, step: 1,  uniform: 'uSpeed' }),
    param({ id: 'monochrome', name: 'Monochrome', type: 'boolean', value: true, defaultValue: true, uniform: 'uMonochrome' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uIntensity;
    uniform float uSize;
    uniform float uSpeed;
    uniform bool  uMonochrome;
    uniform float uTime;
    uniform vec2  uResolution;
    varying vec2 vUv;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 grid = floor(vUv * uResolution / uSize);
      float t = floor(uTime * uSpeed);
      float n1 = rand(grid + vec2(t, 0.0)) - 0.5;
      if (uMonochrome) {
        gl_FragColor = vec4(src.rgb + n1 * uIntensity, src.a);
      } else {
        float n2 = rand(grid + vec2(t, 1.7)) - 0.5;
        float n3 = rand(grid + vec2(t, 3.1)) - 0.5;
        gl_FragColor = vec4(src.rgb + vec3(n1, n2, n3) * uIntensity, src.a);
      }
    }`,
};
