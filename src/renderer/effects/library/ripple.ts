import type { EffectModule } from './types';
import { def, param } from './types';

export const rippleEffect: EffectModule = {
  definition: def('ripple', 'Ripple', 'distort', 'Concentric liquid waves.', 1, [
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5], uniform: 'uCenter' }),
    param({ id: 'amplitude', name: 'Amplitude', value: 20, min: 0, max: 100, uniform: 'uAmplitude' }),
    param({ id: 'frequency', name: 'Frequency', value: 10, min: 0, max: 50, uniform: 'uFrequency' }),
    param({ id: 'speed', name: 'Speed', value: 2, min: 0, max: 10, uniform: 'uSpeed' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec2 uCenter;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform float uSpeed;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - uCenter;
      float dist = length(dir);
      float wave = sin(dist * uFrequency - uTime * uSpeed) * (uAmplitude / uResolution.x);
      vec2 uv = vUv + normalize(dir) * wave;
      gl_FragColor = texture2D(uTexture, clamp(uv, 0.0, 1.0));
    }`,
};
