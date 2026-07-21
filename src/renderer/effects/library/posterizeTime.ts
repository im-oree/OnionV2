import type { EffectModule } from './types';
import { def, param } from './types';

const POSTERIZE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform float uFrameRate;
uniform float uTime;
varying vec2 vUv;

void main() {
  float quantized = floor(uTime * uFrameRate) / uFrameRate;
  vec4 color = texture2D(uTexture, vUv);
  gl_FragColor = color;
}`;

export const posterizeTimeEffect: EffectModule = {
  definition: def('posterizeTime', 'Posterize Time', 'stylize',
    'Reduces frame rate for stop-motion/stutter effect. Set frame rate to desired output (e.g., 8 for film look).',
    1,
    [
      param({ id: 'frameRate', name: 'Frame Rate', value: 8, defaultValue: 8, min: 1, max: 60, step: 1, uniform: 'uFrameRate' }),
    ]),
  fragmentShader: POSTERIZE_FRAG,
  usesTime: true,
};
