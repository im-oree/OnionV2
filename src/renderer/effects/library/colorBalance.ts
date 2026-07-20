import type { EffectModule } from './types';
import { def, param } from './types';

export const colorBalanceEffect: EffectModule = {
  definition: def('colorBalance', 'Color Balance', 'color', 'Adjust color balance per tonal range.', 1, [
    param({ id: 'shadowR', name: 'Shadow R', value: 0, min: -100, max: 100, step: 1, uniform: 'uShadowR' }),
    param({ id: 'shadowG', name: 'Shadow G', value: 0, min: -100, max: 100, step: 1, uniform: 'uShadowG' }),
    param({ id: 'shadowB', name: 'Shadow B', value: 0, min: -100, max: 100, step: 1, uniform: 'uShadowB' }),
    param({ id: 'midR', name: 'Mid R', value: 0, min: -100, max: 100, step: 1, uniform: 'uMidR' }),
    param({ id: 'midG', name: 'Mid G', value: 0, min: -100, max: 100, step: 1, uniform: 'uMidG' }),
    param({ id: 'midB', name: 'Mid B', value: 0, min: -100, max: 100, step: 1, uniform: 'uMidB' }),
    param({ id: 'hiR', name: 'High R', value: 0, min: -100, max: 100, step: 1, uniform: 'uHiR' }),
    param({ id: 'hiG', name: 'High G', value: 0, min: -100, max: 100, step: 1, uniform: 'uHiG' }),
    param({ id: 'hiB', name: 'High B', value: 0, min: -100, max: 100, step: 1, uniform: 'uHiB' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uShadowR,uShadowG,uShadowB;
    uniform float uMidR,uMidG,uMidB;
    uniform float uHiR,uHiG,uHiB;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float lum = dot(src.rgb, vec3(0.299,0.587,0.114));
      float sw = 1.0 - smoothstep(0.0, 0.5, lum);
      float mw = 1.0 - abs(lum - 0.5) * 2.0;
      float hw = smoothstep(0.5, 1.0, lum);
      vec3 adj = vec3(
        uShadowR*sw + uMidR*mw + uHiR*hw,
        uShadowG*sw + uMidG*mw + uHiG*hw,
        uShadowB*sw + uMidB*mw + uHiB*hw
      ) / 100.0;
      gl_FragColor = vec4(clamp(src.rgb + adj, 0.0, 1.0), src.a);
    }`,
};
