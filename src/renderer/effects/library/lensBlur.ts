import type { EffectModule } from './types';
import { def, param } from './types';

export const lensBlurEffect: EffectModule = {
  definition: def('lensBlur', 'Camera Lens Blur', 'blur',
    'Bokeh-style defocus blur with radial samples.', 1, [
    param({ id: 'radius',    name: 'Radius',    value: 15, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
    param({ id: 'bokeh',     name: 'Bokeh',     value: 1.5, min: 1, max: 5, step: 0.1, uniform: 'uBokeh' }),
    param({ id: 'threshold', name: 'Highlight Threshold', value: 0.8, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uRadius;
    uniform float uBokeh;
    uniform float uThreshold;
    uniform vec2  uResolution;
    varying vec2 vUv;
    #define TAU 6.28318530
    void main() {
      vec2 px = uRadius / uResolution;
      vec4 sum = vec4(0.0);
      float total = 0.0;
      const int SAMPLES = 24;
      for (int i = 0; i < SAMPLES; i++) {
        float ang = float(i) / float(SAMPLES) * TAU;
        for (int r = 1; r <= 3; r++) {
          float rf = float(r) / 3.0;
          vec2 offset = vec2(cos(ang), sin(ang)) * px * rf;
          vec4 s = texture2D(uTexture, vUv + offset);
          float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
          float w = lum > uThreshold ? uBokeh : 1.0;
          sum += s * w;
          total += w;
        }
      }
      gl_FragColor = sum / total;
    }`,
};
