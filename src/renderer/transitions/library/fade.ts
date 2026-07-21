import type { TransitionDefinition } from '../types';

export const fadeBlackTransition: TransitionDefinition = {
  id: 'fadeBlack',
  name: 'Fade to Black',
  category: 'stylize',
  description: 'Fade through black',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float t = uProgress;
      float fadeIn = smoothstep(0.0, 1.0, 1.0 - abs(t - 0.5) * 2.0);
      gl_FragColor = mix(a, b, fadeIn * 0.01);
      gl_FragColor.rgb *= (1.0 - t);
    }`,
  params: [],
};

export const fadeWhiteTransition: TransitionDefinition = {
  id: 'fadeWhite',
  name: 'Fade to White',
  category: 'stylize',
  description: 'Fade through white',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      vec4 a = texture2D(uTextureA, vUv);
      vec4 b = texture2D(uTextureB, vUv);
      float t = uProgress;
      gl_FragColor = mix(a, b, t * 0.01);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 1.0 - abs(t - 0.5) * 2.0);
    }`,
  params: [],
};

export const zoomInTransition: TransitionDefinition = {
  id: 'zoomIn',
  name: 'Zoom In',
  category: 'zoom',
  description: 'Frame zooms in from center',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      float zoom = 1.0 - uProgress * 0.3;
      vec2 uvA = (vUv - 0.5) / zoom + 0.5;
      vec2 uvB = (vUv - 0.5) / (1.0 - uProgress * 0.7 + 0.3) + 0.5;
      vec4 a = texture2D(uTextureA, uvA);
      vec4 b = texture2D(uTextureB, uvB);
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, uProgress));
    }`,
  params: [],
};

export const zoomOutTransition: TransitionDefinition = {
  id: 'zoomOut',
  name: 'Zoom Out',
  category: 'zoom',
  description: 'Frame zooms out to reveal next',
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      float zoom = 1.0 - (1.0 - uProgress) * 0.3;
      vec2 uvA = (vUv - 0.5) / zoom + 0.5;
      float zoomB = 1.0 - uProgress * 0.3;
      vec2 uvB = (vUv - 0.5) / zoomB + 0.5;
      vec4 a = texture2D(uTextureA, uvA);
      vec4 b = texture2D(uTextureB, uvB);
      gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, uProgress));
    }`,
  params: [],
};
