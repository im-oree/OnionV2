import type { EffectModule } from './types';
import { def, param } from './types';

export const outerGlowEffect: EffectModule = {
  definition: def('outerGlow', 'Outer Glow', 'stylize',
    'Soft halo around the outside of alpha edges.', 1, [
    param({ id: 'color',     name: 'Color',     type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),
    param({ id: 'radius',    name: 'Radius',    value: 20, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
    param({ id: 'intensity', name: 'Intensity', value: 1.5, min: 0, max: 5, step: 0.1, uniform: 'uIntensity' }),
    param({ id: 'spread',    name: 'Spread',    value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uSpread' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3  uColor;
    uniform float uRadius;
    uniform float uIntensity;
    uniform float uSpread;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 px = uRadius / uResolution;
      float maxA = 0.0;
      const int RINGS = 12;
      for (int i = 0; i < RINGS; i++) {
        float ang = float(i) / float(RINGS) * 6.28318;
        for (int r = 1; r <= 3; r++) {
          float rf = float(r) / 3.0;
          vec2 off = vec2(cos(ang), sin(ang)) * px * rf;
          float a = texture2D(uTexture, vUv + off).a;
          maxA = max(maxA, a * (1.0 - rf * (1.0 - uSpread)));
        }
      }
      float glow = clamp(maxA * uIntensity, 0.0, 1.0);
      float outA = max(src.a, glow);
      vec3 outRGB = mix(uColor, src.rgb, src.a);
      gl_FragColor = vec4(outRGB, outA);
    }`,
};
