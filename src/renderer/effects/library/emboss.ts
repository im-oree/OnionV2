import type { EffectModule } from './types';
import { def, param } from './types';

export const embossEffect: EffectModule = {
  definition: def('emboss', 'Emboss', 'stylize',
    'Raised metal engraving look.', 1, [
    param({ id: 'strength', name: 'Strength', value: 2.0, min: 0, max: 10, step: 0.1, uniform: 'uStrength' }),
    param({ id: 'angle',    name: 'Angle',    type: 'angle', value: 45, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
    param({ id: 'blend',    name: 'Blend',    value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uBlend' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uAngle;
    uniform float uBlend;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      float a = radians(uAngle);
      vec2 offset = vec2(cos(a), sin(a)) / uResolution;
      vec4 c1 = texture2D(uTexture, vUv - offset);
      vec4 c2 = texture2D(uTexture, vUv + offset);
      float lum1 = dot(c1.rgb, vec3(0.299, 0.587, 0.114));
      float lum2 = dot(c2.rgb, vec3(0.299, 0.587, 0.114));
      float diff = (lum2 - lum1) * uStrength + 0.5;
      vec3 emboss = vec3(diff);
      vec4 src = texture2D(uTexture, vUv);
      gl_FragColor = vec4(mix(src.rgb, emboss, uBlend), src.a);
    }`,
};
