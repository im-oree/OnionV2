import type { EffectModule } from './types';
import { def, param } from './types';

export const strokeEffect: EffectModule = {
  definition: def('stroke', 'Stroke', 'stylize',
    'Outline drawn along the alpha edge.', 1, [
    param({ id: 'color',    name: 'Color',    type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColor' }),
    param({ id: 'width',    name: 'Width',    value: 3, min: 0, max: 30, step: 0.5, uniform: 'uWidth' }),
    param({ id: 'position', name: 'Position', type: 'select',
            value: 0, defaultValue: 0,
            options: [
              { label: 'Outside', value: 0 },
              { label: 'Center',  value: 1 },
              { label: 'Inside',  value: 2 },
            ], uniform: 'uPosition' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3  uColor;
    uniform float uWidth;
    uniform float uPosition;
    uniform vec2  uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 px  = uWidth / uResolution;
      float minA = 1.0, maxA = 0.0;
      const int RINGS = 16;
      for (int i = 0; i < RINGS; i++) {
        float ang = float(i) / float(RINGS) * 6.28318;
        vec2 off = vec2(cos(ang), sin(ang)) * px;
        float a = texture2D(uTexture, vUv + off).a;
        minA = min(minA, a);
        maxA = max(maxA, a);
      }
      float outsideMask = (1.0 - src.a) * maxA;
      float insideMask  = src.a * (1.0 - minA);
      float mask = 0.0;
      if (uPosition < 0.5)       mask = outsideMask;
      else if (uPosition < 1.5)  mask = max(outsideMask, insideMask);
      else                       mask = insideMask;
      mask = clamp(mask * 3.0, 0.0, 1.0);
      vec3  rgb = mix(src.rgb, uColor, mask);
      float aa  = max(src.a, mask);
      gl_FragColor = vec4(rgb, aa);
    }`,
};
