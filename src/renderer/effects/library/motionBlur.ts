import type { EffectModule } from './types';
import { def, param } from './types';

export const motionBlurEffect: EffectModule = {
  definition: def('motionBlur', 'Motion Blur', 'blur',
    'Simulates fast camera or object motion.', 1, [
    param({ id: 'angle',    name: 'Angle',    type: 'angle', value: 0,  min: 0, max: 360, step: 1,   uniform: 'uAngle' }),
    param({ id: 'distance', name: 'Distance', value: 30, min: 0, max: 200, step: 1, uniform: 'uDistance' }),
    param({ id: 'samples',  name: 'Quality',  type: 'select',
            value: 16, defaultValue: 16,
            options: [
              { label: 'Low (8)',    value: 8 },
              { label: 'Medium (16)', value: 16 },
              { label: 'High (32)',   value: 32 },
            ], uniform: 'uSamples' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uAngle;
    uniform float uDistance;
    uniform float uSamples;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      float a = radians(uAngle);
      vec2 dir = vec2(cos(a), sin(a)) * uDistance / uResolution;
      int n = int(uSamples);
      vec4 col = vec4(0.0);
      float total = 0.0;
      for (int i = 0; i < 32; i++) {
        if (i >= n) break;
        float t = (float(i) / float(n - 1)) - 0.5;
        col += texture2D(uTexture, vUv + dir * t);
        total += 1.0;
      }
      gl_FragColor = col / total;
    }`,
};
