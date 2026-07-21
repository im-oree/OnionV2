import type { EffectModule } from './types';
import { def, param } from './types';

const WAVES_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uCenterX;
uniform float uCenterY;
uniform float uSpeed;
uniform float uFrequency;
uniform float uWidth;
uniform float uAmplitude;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  
  vec2 center = vec2(uCenterX, uCenterY);
  vec2 delta = vUv - center;
  float dist = length(delta);
  
  // Expanding rings
  float wave = sin((dist * uFrequency - uTime * uSpeed) * 6.28318);
  wave = pow(max(0.0, wave), 8.0 / uWidth);
  
  // Fade with distance
  float fade = exp(-dist * 2.0);
  
  float ring = wave * fade * uAmplitude;
  
  vec3 result = src.rgb + vec3(ring);
  gl_FragColor = vec4(result, max(src.a, ring));
}`;

export const radioWavesEffect: EffectModule = {
  definition: def('radioWaves', 'Radio Waves', 'generate',
    'Expanding concentric rings from a center point.', 1,
    [
      param({ id: 'posX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
      param({ id: 'posY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
      param({ id: 'speed', name: 'Speed', value: 1.0, defaultValue: 1.0, min: 0.1, max: 10, step: 0.1, uniform: 'uSpeed' }),
      param({ id: 'frequency', name: 'Frequency', value: 3.0, defaultValue: 3.0, min: 1, max: 20, step: 0.5, uniform: 'uFrequency' }),
      param({ id: 'waveWidth', name: 'Wave Width', value: 0.5, defaultValue: 0.5, min: 0.1, max: 2, step: 0.1, uniform: 'uWidth' }),
      param({ id: 'amplitude', name: 'Amplitude', value: 1.0, defaultValue: 1.0, min: 0, max: 5, step: 0.1, uniform: 'uAmplitude' }),
    ]),
  fragmentShader: WAVES_FRAG,
  usesTime: true,
};
