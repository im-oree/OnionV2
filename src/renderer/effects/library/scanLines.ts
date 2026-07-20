import type { EffectModule } from './types';
import { def, param } from './types';

export const scanLinesEffect: EffectModule = {
  definition: def('scanLines', 'Scan Lines', 'stylize',
    'CRT-style horizontal scan lines.', 1, [
    param({ id: 'count',     name: 'Density',    value: 200, min: 10,  max: 800, step: 10,  uniform: 'uCount' }),
    param({ id: 'strength',  name: 'Strength',   value: 0.4, min: 0,   max: 1,   step: 0.01, uniform: 'uStrength' }),
    param({ id: 'speed',     name: 'Roll Speed', value: 0,   min: -20, max: 20,  step: 0.1,  uniform: 'uSpeed' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uCount;
    uniform float uStrength;
    uniform float uSpeed;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float roll = uTime * uSpeed * 0.01;
      float line = 0.5 + 0.5 * sin((vUv.y + roll) * uCount * 3.14159);
      gl_FragColor = vec4(src.rgb * mix(1.0, line, uStrength), src.a);
    }`,
};
