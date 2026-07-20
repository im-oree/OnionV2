import type { EffectModule } from './types';
import { def, param } from './types';

export const waveEffect: EffectModule = {
  definition: def(
    'wave',
    'Wave Distortion',
    'distort',
    'Sinusoidal distortion along a direction.',
    1,
    [
      param({ id: 'amplitude', name: 'Amplitude', value: 10, defaultValue: 10, min: 0, max: 200, step: 1, uniform: 'uAmplitude' }),
      param({ id: 'frequency', name: 'Frequency', value: 5, defaultValue: 5, min: 0.1, max: 50, step: 0.5, uniform: 'uFrequency' }),
      param({ id: 'speed', name: 'Speed', value: 1, defaultValue: 1, min: 0, max: 20, step: 0.5, uniform: 'uSpeed' }),
      param({ id: 'direction', name: 'Direction', type: 'vector2', value: [1, 0] as [number, number], defaultValue: [1, 0] as [number, number], uniform: 'uDirection' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform float uAmplitude; uniform float uFrequency;
    uniform float uSpeed; uniform vec2 uDirection; uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      float wave = sin(uv.x * uFrequency * 10.0 + uSpeed) * uAmplitude / uResolution.x;
      uv.x += wave * uDirection.x;
      uv.y += wave * uDirection.y;
      gl_FragColor = texture2D(uTexture, clamp(uv, 0.0, 1.0));
    }`,
};