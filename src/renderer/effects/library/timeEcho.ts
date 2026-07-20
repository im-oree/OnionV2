import type { EffectModule } from './types';
import { def, param } from './types';

export const timeEchoEffect: EffectModule = {
  definition: def('timeEcho', 'Time Echo', 'stylize',
    'Ghost trail approximation using sampled offsets.', 1, [
    param({ id: 'count',    name: 'Echo Count', value: 5,    min: 1, max: 12, step: 1,   uniform: 'uCount' }),
    param({ id: 'shiftX',   name: 'Offset X',   value: 8,    min: -80, max: 80, step: 1, uniform: 'uShiftX' }),
    param({ id: 'shiftY',   name: 'Offset Y',   value: 0,    min: -80, max: 80, step: 1, uniform: 'uShiftY' }),
    param({ id: 'decay',    name: 'Decay',      value: 0.65, min: 0.1, max: 0.95, step: 0.01, uniform: 'uDecay' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uCount;
    uniform float uShiftX;
    uniform float uShiftY;
    uniform float uDecay;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 acc = vec4(0.0);
      float wsum = 0.0;
      int N = int(uCount);
      for (int i = 0; i < 12; i++) {
        if (i >= N) break;
        float fi = float(i);
        vec2 off = vec2(uShiftX, uShiftY) * fi / uResolution;
        float w = pow(uDecay, fi);
        acc += texture2D(uTexture, clamp(vUv - off, 0.0, 1.0)) * w;
        wsum += w;
      }
      gl_FragColor = acc / wsum;
    }`,
};
