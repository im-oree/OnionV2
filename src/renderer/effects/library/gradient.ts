import type { EffectModule } from './types';
import { def, param } from './types';

export const gradientEffect: EffectModule = {
  definition: def(
    'gradient',
    'Gradient Overlay',
    'generate',
    'Overlay a linear gradient with configurable angle.',
    1,
    [
      param({ id: 'colorA', name: 'Color A', type: 'color', value: '#ff0000', defaultValue: '#ff0000', uniform: 'uColorA' }),
      param({ id: 'colorB', name: 'Color B', type: 'color', value: '#0000ff', defaultValue: '#0000ff', uniform: 'uColorB' }),
      param({ id: 'angle', name: 'Angle', type: 'angle', value: 0, defaultValue: 0, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
      param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 100, defaultValue: 100, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform vec3 uColorA; uniform vec3 uColorB;
    uniform float uAngle; uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float a = radians(uAngle);
      vec2 dir = vec2(cos(a), sin(a));
      float t = dot(vUv - 0.5, dir) + 0.5;
      vec3 grad = mix(uColorA, uColorB, clamp(t, 0.0, 1.0));
      gl_FragColor = vec4(mix(src.rgb, grad, uOpacity / 100.0), src.a);
    }`,
};