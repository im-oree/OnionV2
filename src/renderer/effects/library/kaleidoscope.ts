import type { EffectModule } from './types';
import { def, param } from './types';

export const kaleidoscopeEffect: EffectModule = {
  definition: def('kaleidoscope', 'Kaleidoscope', 'distort', 'Symmetrical radial mirror slices.', 1, [
    param({ id: 'segments', name: 'Segments', value: 6, min: 2, max: 24, step: 1, uniform: 'uSegments' }),
    param({ id: 'rotation', name: 'Rotation', value: 0, min: 0, max: 360, step: 1, uniform: 'uRotation' }),
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5] as [number, number], defaultValue: [0.5, 0.5] as [number, number], step: 0.01, uniform: 'uCenter' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uSegments;
    uniform float uRotation;
    uniform vec2 uCenter;
    varying vec2 vUv;
    #define PI 3.14159265
    void main() {
      vec2 uv = vUv - uCenter;
      float angle = atan(uv.y, uv.x) + radians(uRotation);
      float r = length(uv);
      float slice = PI / uSegments;
      angle = mod(angle, 2.0 * slice);
      if (angle > slice) angle = 2.0 * slice - angle;
      vec2 final = uCenter + vec2(cos(angle), sin(angle)) * r;
      gl_FragColor = texture2D(uTexture, clamp(final, 0.0, 1.0));
    }`,
};
