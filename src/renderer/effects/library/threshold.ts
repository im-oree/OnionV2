import type { EffectModule } from './types';
import { def, param } from './types';

export const thresholdEffect: EffectModule = {
  definition: def(
    'threshold',
    'Threshold',
    'color',
    'Convert to black/white based on luminance level.',
    1,
    [
      param({ id: 'level', name: 'Level', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uLevel' }),
      param({ id: 'smoothness', name: 'Smoothness', value: 0.1, defaultValue: 0.1, min: 0, max: 1, step: 0.01, uniform: 'uSmoothness' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform float uLevel; uniform float uSmoothness;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      float thresh = smoothstep(uLevel - uSmoothness, uLevel + uSmoothness, lum);
      gl_FragColor = vec4(vec3(thresh), src.a * thresh);
    }`,
};