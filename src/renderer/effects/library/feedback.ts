import type { EffectModule } from './types';
import { def, param } from './types';

export const feedbackEffect: EffectModule = {
  definition: def('feedback', 'Feedback', 'stylize',
    'Frame trails with zoom and rotation.', 1, [
    param({ id: 'strength', name: 'Strength', value: 0.7,  min: 0,   max: 1,   step: 0.01, uniform: 'uStrength' }),
    param({ id: 'zoom',     name: 'Zoom',     value: 1.02, min: 0.9, max: 1.2, step: 0.001, uniform: 'uZoom' }),
    param({ id: 'rotation', name: 'Rotation', type: 'angle', value: 0, min: -30, max: 30, step: 0.1, uniform: 'uRotation' }),
    param({ id: 'shiftX',   name: 'Shift X',  value: 0,    min: -50, max: 50,  step: 1,    uniform: 'uShiftX' }),
    param({ id: 'shiftY',   name: 'Shift Y',  value: 0,    min: -50, max: 50,  step: 1,    uniform: 'uShiftY' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uZoom;
    uniform float uRotation;
    uniform float uShiftX;
    uniform float uShiftY;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 c = vec2(0.5);
      vec2 uv = (vUv - c) / uZoom;
      float a = radians(uRotation);
      float cs = cos(a), sn = sin(a);
      uv = vec2(cs*uv.x - sn*uv.y, sn*uv.x + cs*uv.y);
      uv += c + vec2(uShiftX, uShiftY) / uResolution;
      vec4 fb = texture2D(uTexture, clamp(uv, 0.0, 1.0));
      gl_FragColor = mix(src, fb, uStrength);
    }`,
};
