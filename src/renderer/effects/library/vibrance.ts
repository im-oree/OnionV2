import type { EffectModule } from './types';
import { def, param } from './types';

export const vibranceEffect: EffectModule = {
  definition: def('vibrance', 'Vibrance', 'color', 'Intelligently boosts muted colours.', 1, [
    param({ id: 'vibrance', name: 'Vibrance', value: 0, min: -100, max: 100, step: 1, uniform: 'uVibrance' }),
    param({ id: 'saturation', name: 'Saturation', value: 0, min: -100, max: 100, step: 1, uniform: 'uSaturation' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uVibrance;
    uniform float uSaturation;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float mx = max(src.r, max(src.g, src.b));
      float avg = (src.r + src.g + src.b) / 3.0;
      float lum = 0.299*src.r + 0.587*src.g + 0.114*src.b;
      float vib = (1.0 - (mx - avg)) * uVibrance / 100.0;
      vec3 col = mix(vec3(lum), src.rgb, 1.0 + vib + uSaturation / 100.0);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
    }`,
};
