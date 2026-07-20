import type { EffectModule } from './types';
import { def, param } from './types';

export const curvesEffect: EffectModule = {
  definition: def('curves', 'Curves', 'color', 'S-curve contrast or channel-specific colour grading.', 1, [
    param({ id: 'masterIn', name: 'Master In', value: 0, min: -1, max: 1, step: 0.01, uniform: 'uMasterIn' }),
    param({ id: 'masterOut', name: 'Master Out', value: 0, min: -1, max: 1, step: 0.01, uniform: 'uMasterOut' }),
    param({ id: 'rIn', name: 'Red In', value: 0, min: -1, max: 1, step: 0.01, uniform: 'uRIn' }),
    param({ id: 'gIn', name: 'Green In', value: 0, min: -1, max: 1, step: 0.01, uniform: 'uGIn' }),
    param({ id: 'bIn', name: 'Blue In', value: 0, min: -1, max: 1, step: 0.01, uniform: 'uBIn' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uMasterIn, uMasterOut;
    uniform float uRIn, uGIn, uBIn;
    varying vec2 vUv;
    float applyCurve(float v, float inAdj, float outAdj) {
      v = clamp(v + inAdj, 0.0, 1.0);
      float s = v < 0.5
        ? 0.5 * pow(2.0 * v, 1.0 + outAdj)
        : 1.0 - 0.5 * pow(2.0 * (1.0 - v), 1.0 + outAdj);
      return clamp(s, 0.0, 1.0);
    }
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 col;
      col.r = applyCurve(src.r + uRIn, uMasterIn, uMasterOut);
      col.g = applyCurve(src.g + uGIn, uMasterIn, uMasterOut);
      col.b = applyCurve(src.b + uBIn, uMasterIn, uMasterOut);
      gl_FragColor = vec4(col, src.a);
    }`,
};
