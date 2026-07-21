import type { TransitionDefinition } from '../types';
import { param } from '../types';

export const wipeTransition: TransitionDefinition = {
  id: 'wipe',
  name: 'Wipe',
  category: 'wipe',
  description: 'Directional wipe reveal with adjustable angle',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    uniform float uAngle;
    uniform vec2 uResolution;
    varying vec2 vUv;

    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      d.x *= uResolution.x / uResolution.y;
      float rad = uAngle * 3.14159 / 180.0;
      vec2 rd = vec2(d.x * cos(rad) - d.y * sin(rad), d.x * sin(rad) + d.y * cos(rad));
      float edge = (rd.x / (uResolution.x / uResolution.y) + 1.0) * 0.5;
      float alpha = smoothstep(edge - uFeather * 0.3, edge + uFeather * 0.3, uProgress);
      gl_FragColor = mix(a, b, alpha);
    }`,
  params: [
    param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' }),
    param({ id: 'angle', name: 'Angle', value: 0, defaultValue: 0, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
  ],
};

export const wipeLeftTransition: TransitionDefinition = {
  id: 'wipeLeft',
  name: 'Wipe Left',
  category: 'wipe',
  description: 'Wipe from right to left',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float alpha = smoothstep(uProgress - uFeather * 0.2, uProgress + uFeather * 0.2, 1.0 - vUv.x);
      gl_FragColor = mix(a, b, alpha);
    }`,
  params: [param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' })],
};

export const wipeRightTransition: TransitionDefinition = {
  id: 'wipeRight',
  name: 'Wipe Right',
  category: 'wipe',
  description: 'Wipe from left to right',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float alpha = smoothstep(uProgress - uFeather * 0.2, uProgress + uFeather * 0.2, vUv.x);
      gl_FragColor = mix(a, b, alpha);
    }`,
  params: [param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' })],
};

export const wipeUpTransition: TransitionDefinition = {
  id: 'wipeUp',
  name: 'Wipe Up',
  category: 'wipe',
  description: 'Wipe from bottom to top',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float alpha = smoothstep(uProgress - uFeather * 0.2, uProgress + uFeather * 0.2, 1.0 - vUv.y);
      gl_FragColor = mix(a, b, alpha);
    }`,
  params: [param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' })],
};

export const wipeDownTransition: TransitionDefinition = {
  id: 'wipeDown',
  name: 'Wipe Down',
  category: 'wipe',
  description: 'Wipe from top to bottom',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    uniform float uFeather;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float alpha = smoothstep(uProgress - uFeather * 0.2, uProgress + uFeather * 0.2, vUv.y);
      gl_FragColor = mix(a, b, alpha);
    }`,
  params: [param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' })],
};
