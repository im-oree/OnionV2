import type { EffectModule } from './types';
import { def, param } from './types';

export const innerGlowEffect: EffectModule = {
  definition: def('innerGlow', 'Inner Glow', 'stylize',
    'Glow that emits from inside the alpha edges.', 1, [
    param({ id: 'color',     name: 'Color',     type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),
    param({ id: 'radius',    name: 'Radius',    value: 15, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
    param({ id: 'intensity', name: 'Intensity', value: 1.0, min: 0, max: 3, step: 0.1, uniform: 'uIntensity' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3  uColor;
    uniform float uRadius;
    uniform float uIntensity;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      if (src.a < 0.01) { gl_FragColor = src; return; }
      vec2 px = uRadius / uResolution;
      float minAlpha = 1.0;
      const int RINGS = 8;
      for (int i = 0; i < RINGS; i++) {
        float ang = float(i) / float(RINGS) * 6.28318;
        vec2 off = vec2(cos(ang), sin(ang)) * px;
        minAlpha = min(minAlpha, texture2D(uTexture, vUv + off).a);
      }
      float glow = (1.0 - minAlpha) * uIntensity;
      gl_FragColor = vec4(mix(src.rgb, uColor, glow), src.a);
    }`,
};
