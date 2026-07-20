import type { EffectModule } from './types';
import { def, param } from './types';

export const cartoonEffect: EffectModule = {
  definition: def('cartoon', 'Cartoon', 'stylize', 'Quantised colours with dark outlines.', 1, [
    param({ id: 'colorLevels', name: 'Colour Steps', value: 5, min: 2, max: 16, step: 1, uniform: 'uColorLevels' }),
    param({ id: 'edgeWidth', name: 'Edge Width', value: 1.5, min: 0, max: 5, step: 0.1, uniform: 'uEdgeWidth' }),
    param({ id: 'edgeStrength', name: 'Edge Strength', value: 0.8, min: 0, max: 1, step: 0.01, uniform: 'uEdgeStrength' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uColorLevels;
    uniform float uEdgeWidth;
    uniform float uEdgeStrength;
    uniform vec2 uResolution;
    varying vec2 vUv;
    float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec3 col = floor(src.rgb * uColorLevels) / (uColorLevels - 1.0);
      vec2 px = uEdgeWidth / uResolution;
      float l00 = luminance(texture2D(uTexture, vUv + vec2(-px.x, -px.y)).rgb);
      float l10 = luminance(texture2D(uTexture, vUv + vec2(0., -px.y)).rgb);
      float l20 = luminance(texture2D(uTexture, vUv + vec2(px.x, -px.y)).rgb);
      float l01 = luminance(texture2D(uTexture, vUv + vec2(-px.x, 0.)).rgb);
      float l21 = luminance(texture2D(uTexture, vUv + vec2(px.x, 0.)).rgb);
      float l02 = luminance(texture2D(uTexture, vUv + vec2(-px.x, px.y)).rgb);
      float l12 = luminance(texture2D(uTexture, vUv + vec2(0., px.y)).rgb);
      float l22 = luminance(texture2D(uTexture, vUv + vec2(px.x, px.y)).rgb);
      float gx = -l00 + l20 - 2.0*l01 + 2.0*l21 - l02 + l22;
      float gy = -l00 - 2.0*l10 - l20 + l02 + 2.0*l12 + l22;
      float edge = clamp(sqrt(gx*gx + gy*gy) * 4.0, 0.0, 1.0);
      col = mix(col, vec3(0.0), edge * uEdgeStrength);
      gl_FragColor = vec4(col, src.a);
    }`,
};
