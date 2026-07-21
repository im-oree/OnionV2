import type { EffectModule } from './types';
import { def, param } from './types';

const LIQUIFY_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uCenterX;
uniform float uCenterY;
uniform float uStrength;
uniform float uRadius;
uniform float uMode;
varying vec2 vUv;

void main() {
  vec2 center = vec2(uCenterX, uCenterY);
  vec2 uv = vUv;
  vec2 delta = uv - center;
  float aspect = uResolution.x / uResolution.y;
  delta.x *= aspect;
  float dist = length(delta);
  
  if (dist < uRadius && dist > 0.001) {
    float t = 1.0 - dist / uRadius;
    float influence = t * t * uStrength;
    vec2 dir = normalize(delta);
    
    if (uMode < 0.5) {
      uv = vUv - dir * influence * 0.05;
    } else if (uMode < 1.5) {
      uv = vUv + dir * influence * 0.05;
    } else {
      float angle = influence * 2.0;
      float cs = cos(angle), sn = sin(angle);
      vec2 rd = vec2(delta.x * cs - delta.y * sn, delta.x * sn + delta.y * cs);
      rd.x /= aspect;
      uv = center + rd;
    }
  }
  
  uv = clamp(uv, 0.0, 1.0);
  gl_FragColor = texture2D(uTexture, uv);
}`;

export const liquifyEffect: EffectModule = {
  definition: def('liquify', 'Liquify', 'distort',
    'Warp distortion — bulge, pinch, or twirl at a center point.',
    1,
    [
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
      param({ id: 'strength', name: 'Strength', value: 1.0, defaultValue: 1.0, min: -3, max: 3, step: 0.1, uniform: 'uStrength' }),
      param({ id: 'radius', name: 'Radius', value: 0.3, defaultValue: 0.3, min: 0.05, max: 1, step: 0.01, uniform: 'uRadius' }),
      param({ id: 'mode', name: 'Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Bulge', value: 0 },
          { label: 'Pinch', value: 1 },
          { label: 'Twirl', value: 2 },
        ], uniform: 'uMode' }),
    ]),
  fragmentShader: LIQUIFY_FRAG,
};
