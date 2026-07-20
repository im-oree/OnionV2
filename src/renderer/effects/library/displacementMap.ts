import type { EffectModule } from './types';
import { def, param } from './types';

export const displacementMapEffect: EffectModule = {
  definition: def('displacementMap', 'Displacement Map', 'distort',
    'Offset pixels by a procedural (or custom) map.', 1, [
    param({ id: 'pattern', name: 'Pattern', type: 'select',
            value: 0, defaultValue: 0,
            options: [
              { label: 'Noise',   value: 0 },
              { label: 'Checker', value: 1 },
              { label: 'Ramp X',  value: 2 },
              { label: 'Ramp Y',  value: 3 },
              { label: 'Radial',  value: 4 },
            ], uniform: 'uPattern' }),
    param({ id: 'scale',      name: 'Scale',      value: 3.0, min: 0.1, max: 20, step: 0.1, uniform: 'uScale' }),
    param({ id: 'amountX',    name: 'Amount X',   value: 20,  min: -200, max: 200, step: 1, uniform: 'uAmountX' }),
    param({ id: 'amountY',    name: 'Amount Y',   value: 20,  min: -200, max: 200, step: 1, uniform: 'uAmountY' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uPattern;
    uniform float uScale;
    uniform float uAmountX;
    uniform float uAmountY;
    uniform vec2  uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }

    vec2 mapValue(vec2 uv) {
      vec2 p = uv * uScale;
      if (uPattern < 0.5) {
        return vec2(noise(p) - 0.5, noise(p + vec2(9.7, 2.3)) - 0.5);
      } else if (uPattern < 1.5) {
        vec2 c = step(0.5, fract(p));
        float v = mod(c.x + c.y, 2.0) - 0.5;
        return vec2(v, v);
      } else if (uPattern < 2.5) {
        return vec2(uv.x - 0.5, 0.0);
      } else if (uPattern < 3.5) {
        return vec2(0.0, uv.y - 0.5);
      } else {
        vec2 d = uv - 0.5;
        return d * length(d) * 2.0;
      }
    }

    void main() {
      vec2 disp = mapValue(vUv) * vec2(uAmountX, uAmountY) / uResolution;
      gl_FragColor = texture2D(uTexture, clamp(vUv + disp, 0.0, 1.0));
    }`,
};
