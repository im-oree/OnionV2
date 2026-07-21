import type { TransitionDefinition } from '../types';
import { param } from '../types';

export const dissolveTransition: TransitionDefinition = {
  id: 'dissolve',
  name: 'Dissolve',
  category: 'basic',
  description: 'Smooth noise-based crossfade between frames',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                 mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }

    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float n = noise(vUv * 8.0 + uTime * 0.5);
      float alpha = smoothstep(uProgress - uFeather, uProgress + uFeather, n);
      gl_FragColor = mix(a, b, alpha);
    }`,
  params: [
    param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' }),
  ],
};
