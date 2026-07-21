import type { EffectModule } from './types';
import { def, param } from './types';

const REVEAL_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uProgress;
uniform float uRadius;
uniform float uFeather;
uniform float uSoftness;
uniform float uInvert;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 delta = vUv - uCenter;
  float aspect = uResolution.x / uResolution.y;
  delta.x *= aspect;
  float dist = length(delta);
  float maxR = uRadius * uProgress;
  float softEdge = uFeather * 0.1;
  float mask;
  if (uSoftness > 0.0) {
    mask = smoothstep(maxR - softEdge, maxR + softEdge * uSoftness, dist);
  } else {
    mask = step(maxR, dist);
  }
  if (uInvert > 0.5) mask = 1.0 - mask;
  float alpha = src.a * (1.0 - mask);
  gl_FragColor = vec4(src.rgb * (1.0 - mask), alpha);
}`;

export const radialRevealEffect: EffectModule = {
  definition: def('radialReveal', 'Radial Reveal', 'transition',
    'Circular wipe that reveals/hides the layer from center outward. Keyframe Progress to animate.',
    1,
    [
      param({ id: 'progress', name: 'Progress', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uProgress' }),
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
      param({ id: 'radius', name: 'Radius', value: 1.2, defaultValue: 1.2, min: 0.1, max: 3, step: 0.01, uniform: 'uRadius' }),
      param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 2, step: 0.01, uniform: 'uFeather' }),
      param({ id: 'softness', name: 'Softness', value: 1.0, defaultValue: 1.0, min: 0, max: 3, step: 0.1, uniform: 'uSoftness' }),
      param({ id: 'invert', name: 'Invert', type: 'boolean', value: false, defaultValue: false, uniform: 'uInvert' }),
    ]),
  fragmentShader: REVEAL_FRAG,
  usesTime: true,
};
