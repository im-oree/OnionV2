import type { EffectModule } from './types';
import { def, param } from './types';

export const halftoneEffect: EffectModule = {
  definition: def('halftone', 'Halftone', 'stylize',
    'CMYK-newspaper style dot pattern.', 1, [
    param({ id: 'dotSize', name: 'Dot Size', value: 6, min: 2, max: 30, step: 1, uniform: 'uDotSize' }),
    param({ id: 'angle',   name: 'Angle',    type: 'angle', value: 45, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uDotSize;
    uniform float uAngle;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      float a = radians(uAngle);
      vec2 rot = vec2(cos(a), sin(a));
      vec2 p = vUv * uResolution;
      vec2 rp = vec2(rot.x*p.x - rot.y*p.y, rot.y*p.x + rot.x*p.y);
      vec2 cell = mod(rp, uDotSize) - uDotSize * 0.5;
      float dist = length(cell);
      float radius = (1.0 - lum) * uDotSize * 0.5;
      float dot = smoothstep(radius + 1.0, radius - 1.0, dist);
      gl_FragColor = vec4(vec3(1.0 - dot), src.a);
    }`,
};
