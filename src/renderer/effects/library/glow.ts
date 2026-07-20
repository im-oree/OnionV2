import type { EffectModule } from './types';
import { def, param } from './types';

export const glowEffect: EffectModule = {
  definition: def(
    'glow',
    'Glow',
    'stylize',
    'Bloom/glow around bright areas.',
    1,
    [
      param({ id: 'threshold', name: 'Threshold', value: 0.7, defaultValue: 0.7, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'radius', name: 'Radius', value: 20, defaultValue: 20, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
      param({ id: 'intensity', name: 'Intensity', value: 1.5, defaultValue: 1.5, min: 0, max: 5, step: 0.1, uniform: 'uIntensity' }),
      param({ id: 'color', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform float uThreshold; uniform float uIntensity;
    uniform vec3 uColor; uniform vec2 uResolution; uniform float uRadius;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 off = (1.0 / uResolution) * uRadius;
      vec4 blur = vec4(0.0);
      float total = 0.0;
      for (int x = -3; x <= 3; x++) {
        for (int y = -3; y <= 3; y++) {
          float w = 1.0;
          vec4 s = texture2D(uTexture, vUv + vec2(float(x), float(y)) * off);
          float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
          if (lum > uThreshold) {
            blur += s * w;
            total += w;
          }
        }
      }
      if (total > 0.0) blur /= total;
      vec3 glow = uColor * blur.rgb * uIntensity;
      gl_FragColor = vec4(src.rgb + glow, max(src.a, blur.a * uIntensity));
    }`,
};