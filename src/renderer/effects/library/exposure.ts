import type { EffectModule } from './types';
import { def, param } from './types';

export const exposureEffect: EffectModule = {
  definition: def('exposure', 'Exposure', 'color', 'Camera-style exposure in stops.', 1, [
    param({ id: 'exposure', name: 'Exposure', value: 0, min: -5, max: 5, step: 0.1, uniform: 'uExposure' }),
    param({ id: 'offset', name: 'Offset', value: 0, min: -1, max: 1, step: 0.01, uniform: 'uOffset' }),
    param({ id: 'gamma', name: 'Gamma', value: 1, min: 0.1, max: 3, step: 0.05, uniform: 'uGamma' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uExposure;
    uniform float uOffset;
    uniform float uGamma;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 col = src.rgb * pow(2.0, uExposure) + uOffset;
      col = pow(max(col, 0.0), vec3(1.0 / max(uGamma, 0.01)));
      gl_FragColor = vec4(col, src.a);
    }`,
};
