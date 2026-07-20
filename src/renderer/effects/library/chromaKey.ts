import type { EffectModule } from './types';
import { def, param } from './types';

export const chromaKeyEffect: EffectModule = {
  definition: def('chromaKey', 'Chroma Key', 'color', 'Remove a background color (green/blue screen).', 1, [
    param({ id: 'keyColor', name: 'Key Color', type: 'color', value: '#00ff00', defaultValue: '#00ff00', uniform: 'uKeyColor' }),
    param({ id: 'similarity', name: 'Similarity', value: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uSimilarity' }),
    param({ id: 'smoothness', name: 'Smoothness', value: 0.1, min: 0, max: 1, step: 0.01, uniform: 'uSmoothness' }),
    param({ id: 'spill', name: 'Spill Supp.', value: 0.1, min: 0, max: 1, step: 0.01, uniform: 'uSpill' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3 uKeyColor;
    uniform float uSimilarity;
    uniform float uSmoothness;
    uniform float uSpill;
    varying vec2 vUv;

    vec2 RGBtoUV(vec3 rgb) {
      return vec2(
        rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5 + 0.5,
        rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081 + 0.5
      );
    }

    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 uvKey = RGBtoUV(uKeyColor);
      vec2 uvSrc = RGBtoUV(src.rgb);
      float dist = distance(uvKey, uvSrc);
      float mask = smoothstep(uSimilarity, uSimilarity + uSmoothness, dist);
      vec3 col = src.rgb;
      float spill = max(0.0, 1.0 - dist / max(uSimilarity, 0.001));
      col -= uKeyColor * spill * uSpill;
      col = max(col, 0.0);
      gl_FragColor = vec4(col, src.a * mask);
    }`,
};
