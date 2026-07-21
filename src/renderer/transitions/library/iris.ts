import type { TransitionDefinition } from '../types';
import { param } from '../types';

export const irisTransition: TransitionDefinition = {
  id: 'iris',
  name: 'Iris',
  category: 'stylize',
  description: 'Circular reveal from center',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    uniform vec2 uCenter;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      vec2 d = vUv - uCenter;
      d.x *= uResolution.x / uResolution.y;
      float dist = length(d);
      float radius = uProgress * 1.5;
      float mask = smoothstep(radius - uFeather * 0.2, radius, dist);
      gl_FragColor = mix(a, b, 1.0 - mask);
    }`,
  params: [
    param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' }),
    param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
    param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
  ],
};

export const crossDissolveTransition: TransitionDefinition = {
  id: 'crossDissolve',
  name: 'Cross Dissolve',
  category: 'basic',
  description: 'Simple opacity crossfade between frames',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, uProgress));
    }`,
  params: [],
};
