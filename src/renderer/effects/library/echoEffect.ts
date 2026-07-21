import type { EffectModule } from './types';
import { def, param } from './types';

const ECHO_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uDecay;
uniform float uIntensity;
uniform float uSamples;
uniform float uDirectionX;
uniform float uDirectionY;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);
  float totalWeight = 1.0;
  vec2 dir = vec2(uDirectionX, uDirectionY) / uResolution;
  
  for (float i = 1.0; i <= 8.0; i += 1.0) {
    if (i > uSamples) break;
    float weight = pow(uDecay, i);
    vec2 offset = dir * i * 2.0;
    vec4 sample = texture2D(uTexture, vUv + offset);
    color += sample * weight * uIntensity;
    totalWeight += weight;
  }
  
  gl_FragColor = vec4(color.rgb / totalWeight, color.a);
}`;

export const echoEffect: EffectModule = {
  definition: def('echo', 'Echo', 'stylize',
    'Creates motion trail echoes by layering offset copies with decay.',
    1,
    [
      param({ id: 'decay', name: 'Decay', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uDecay' }),
      param({ id: 'intensity', name: 'Intensity', value: 1.0, defaultValue: 1.0, min: 0, max: 3, step: 0.1, uniform: 'uIntensity' }),
      param({ id: 'samples', name: 'Echo Count', value: 4, defaultValue: 4, min: 1, max: 8, step: 1, uniform: 'uSamples' }),
      param({ id: 'dirX', name: 'Direction X', value: 1, defaultValue: 1, min: -5, max: 5, step: 0.1, uniform: 'uDirectionX' }),
      param({ id: 'dirY', name: 'Direction Y', value: 0, defaultValue: 0, min: -5, max: 5, step: 0.1, uniform: 'uDirectionY' }),
    ]),
  fragmentShader: ECHO_FRAG,
};
