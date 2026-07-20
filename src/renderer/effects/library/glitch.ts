import type { EffectModule } from './types';
import { def, param } from './types';

export const glitchEffect: EffectModule = {
  definition: def('glitch', 'Glitch', 'stylize', 'Digital glitch with block displacement and RGB shift.', 1, [
    param({ id: 'amount', name: 'Amount', value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uAmount' }),
    param({ id: 'speed', name: 'Speed', value: 2.0, min: 0, max: 10, step: 0.1, uniform: 'uSpeed' }),
    param({ id: 'blockSize', name: 'Block Size', value: 8.0, min: 1, max: 32, step: 1, uniform: 'uBlockSize' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAmount;
    uniform float uSpeed;
    uniform float uBlockSize;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;
    float rand(float x) { return fract(sin(x * 127.1) * 43758.5453); }
    void main() {
      float t = floor(uTime * uSpeed * 10.0) / 10.0;
      float row = floor(vUv.y * uResolution.y / uBlockSize);
      float rnd = rand(row + t);
      float shift = (rnd - 0.5) * uAmount * 0.05;
      vec2 uv1 = vec2(vUv.x + shift, vUv.y);
      vec4 col = texture2D(uTexture, clamp(uv1, 0.0, 1.0));
      float rs = shift * 2.0;
      float r = texture2D(uTexture, clamp(vec2(vUv.x + rs, vUv.y), 0.0, 1.0)).r;
      float b = texture2D(uTexture, clamp(vec2(vUv.x - rs, vUv.y), 0.0, 1.0)).b;
      gl_FragColor = vec4(r, col.g, b, col.a);
    }`,
};
