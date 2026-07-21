import type { TransitionDefinition } from '../types';
import { param } from '../types';

export const slideLeftTransition: TransitionDefinition = {
  id: 'slideLeft',
  name: 'Slide Left',
  category: 'slide',
  description: 'Frame slides in from the right',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec4 a = texture2D(uTextureA, uv + vec2(uProgress, 0.0));
      vec4 b = texture2D(uTextureB, uv - vec2(1.0 - uProgress, 0.0));
      float blend = uProgress;
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, blend));
    }`,
  params: [],
};

export const slideRightTransition: TransitionDefinition = {
  id: 'slideRight',
  name: 'Slide Right',
  category: 'slide',
  description: 'Frame slides in from the left',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec4 a = texture2D(uTextureA, uv - vec2(uProgress, 0.0));
      vec4 b = texture2D(uTextureB, uv + vec2(1.0 - uProgress, 0.0));
      float blend = uProgress;
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, blend));
    }`,
  params: [],
};

export const slideUpTransition: TransitionDefinition = {
  id: 'slideUp',
  name: 'Slide Up',
  category: 'slide',
  description: 'Frame slides in from the bottom',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec4 a = texture2D(uTextureA, uv - vec2(0.0, 1.0 - uProgress));
      vec4 b = texture2D(uTextureB, uv + vec2(0.0, uProgress));
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, uProgress));
    }`,
  params: [],
};

export const slideDownTransition: TransitionDefinition = {
  id: 'slideDown',
  name: 'Slide Down',
  category: 'slide',
  description: 'Frame slides in from the top',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec4 a = texture2D(uTextureA, uv + vec2(0.0, 1.0 - uProgress));
      vec4 b = texture2D(uTextureB, uv - vec2(0.0, uProgress));
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, uProgress));
    }`,
  params: [],
};
