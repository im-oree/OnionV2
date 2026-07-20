import type { EffectModule } from './types';
import { def, param } from './types';

export const turbulentDisplaceEffect: EffectModule = {
  definition: def('turbulentDisplace', 'Turbulent Displace', 'distort', 'Heat shimmer / liquid displacement via animated noise.', 1, [
    param({ id: 'amount', name: 'Amount', value: 20, min: 0, max: 200, step: 1, uniform: 'uAmount' }),
    param({ id: 'scale', name: 'Scale', value: 3.0, min: 0.1, max: 20, step: 0.1, uniform: 'uScale' }),
    param({ id: 'speed', name: 'Speed', value: 1.0, min: 0, max: 10, step: 0.1, uniform: 'uSpeed' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAmount;
    uniform float uScale;
    uniform float uSpeed;
    uniform float uTime;
    uniform vec2 uResolution;
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
    float fbm(vec2 p) {
      float v=0.0,a=0.5;
      for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}
      return v;
    }

    void main() {
      float t = uTime * uSpeed;
      vec2 p = vUv * uScale;
      float dx = fbm(p + vec2(t * 0.7, t * 0.3)) - 0.5;
      float dy = fbm(p + vec2(t * 0.3, t * 0.8) + vec2(1.7, 9.2)) - 0.5;
      vec2 offset = vec2(dx, dy) * uAmount / uResolution;
      gl_FragColor = texture2D(uTexture, clamp(vUv + offset, 0.0, 1.0));
    }`,
};
