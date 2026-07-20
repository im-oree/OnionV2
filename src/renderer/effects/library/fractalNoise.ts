import type { EffectModule } from './types';
import { def, param } from './types';

export const fractalNoiseEffect: EffectModule = {
  definition: def('fractalNoise', 'Fractal Noise', 'generate', 'Multi-octave perlin-style noise overlay.', 1, [
    param({ id: 'scale', name: 'Scale', value: 3.0, min: 0.1, max: 20, step: 0.1, uniform: 'uScale' }),
    param({ id: 'octaves', name: 'Complexity', value: 4, min: 1, max: 8, step: 1, uniform: 'uOctaves' }),
    param({ id: 'speed', name: 'Speed', value: 0.5, min: 0, max: 5, step: 0.1, uniform: 'uSpeed' }),
    param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 50, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uScale;
    uniform float uOctaves;
    uniform float uSpeed;
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float val = 0.0, amp = 0.5, freq = 1.0;
      for (int i = 0; i < 8; i++) {
        if (float(i) >= uOctaves) break;
        val += amp * noise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
      }
      return val;
    }

    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float n = fbm(vUv * uScale + uTime * uSpeed);
      float op = uOpacity / 100.0;
      vec3 col = src.rgb + (n - 0.5) * op;
      gl_FragColor = vec4(col, src.a);
    }`,
};
