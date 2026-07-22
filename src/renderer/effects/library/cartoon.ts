import type { EffectModule } from './types';
import { def, param } from './types';

export const cartoonEffect: EffectModule = {
  definition: def(
    'cartoon',
    'Cartoon',
    'stylize',
    'Posterised colours with ink outlines. Multiple styles from anime to comic book.',
    1,
    [
      param({ id: 'colorLevels',    name: 'Colour Steps',     value: 5,    defaultValue: 5,    min: 2,  max: 16,  step: 1,    uniform: 'uColorLevels' }),
      param({ id: 'saturation',     name: 'Saturation',       value: 1.4,  defaultValue: 1.4,  min: 0,  max: 3,   step: 0.05, uniform: 'uSaturation' }),
      param({ id: 'brightness',     name: 'Brightness',       value: 1.05, defaultValue: 1.05, min: 0,  max: 2,   step: 0.05, uniform: 'uBrightness' }),
      param({ id: 'smoothing',      name: 'Smoothing',        value: 1.0,  defaultValue: 1.0,  min: 0,  max: 4,   step: 0.1,  uniform: 'uSmoothing' }),
      param({ id: 'edgeWidth',      name: 'Edge Width',       value: 1.0,  defaultValue: 1.0,  min: 0,  max: 5,   step: 0.1,  uniform: 'uEdgeWidth' }),
      param({ id: 'edgeThreshold',  name: 'Edge Threshold',   value: 0.15, defaultValue: 0.15, min: 0,  max: 1,   step: 0.01, uniform: 'uEdgeThreshold' }),
      param({ id: 'edgeSoftness',   name: 'Edge Softness',    value: 0.1,  defaultValue: 0.1,  min: 0.01, max: 1, step: 0.01, uniform: 'uEdgeSoftness' }),
      param({ id: 'edgeStrength',   name: 'Edge Strength',    value: 1.0,  defaultValue: 1.0,  min: 0,  max: 1,   step: 0.01, uniform: 'uEdgeStrength' }),
      param({ id: 'edgeColor',      name: 'Edge Colour',      type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uEdgeColor' }),
    ],
  ),
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform vec2  uResolution;
    uniform float uColorLevels;
    uniform float uSaturation;
    uniform float uBrightness;
    uniform float uSmoothing;
    uniform float uEdgeWidth;
    uniform float uEdgeThreshold;
    uniform float uEdgeSoftness;
    uniform float uEdgeStrength;
    uniform vec3  uEdgeColor;
    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    // ---- RGB <-> HSV helpers (posterize in HSV = keep colour, band only value) ----
    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    // Small box blur to smooth out texture/noise before posterising
    vec3 smoothSample(vec2 uv, vec2 px) {
      float r = uSmoothing;
      if (r < 0.01) return texture2D(uTexture, uv).rgb;
      vec3 sum = vec3(0.0);
      sum += texture2D(uTexture, uv + px * vec2(-1.0, -1.0) * r).rgb;
      sum += texture2D(uTexture, uv + px * vec2( 0.0, -1.0) * r).rgb * 2.0;
      sum += texture2D(uTexture, uv + px * vec2( 1.0, -1.0) * r).rgb;
      sum += texture2D(uTexture, uv + px * vec2(-1.0,  0.0) * r).rgb * 2.0;
      sum += texture2D(uTexture, uv                              ).rgb * 4.0;
      sum += texture2D(uTexture, uv + px * vec2( 1.0,  0.0) * r).rgb * 2.0;
      sum += texture2D(uTexture, uv + px * vec2(-1.0,  1.0) * r).rgb;
      sum += texture2D(uTexture, uv + px * vec2( 0.0,  1.0) * r).rgb * 2.0;
      sum += texture2D(uTexture, uv + px * vec2( 1.0,  1.0) * r).rgb;
      return sum / 16.0;
    }

    void main() {
      vec2 px = 1.0 / uResolution;
      vec4 src = texture2D(uTexture, vUv);

      // 1) Smooth to kill noise/texture
      vec3 col = smoothSample(vUv, px);

      // 2) Posterise in HSV: quantise value + slightly quantise saturation
      vec3 hsv = rgb2hsv(col);
      float steps = uColorLevels;
      hsv.z = floor(hsv.z * steps + 0.5) / steps;                    // value bands
      hsv.y = floor(hsv.y * max(steps - 1.0, 1.0)) / max(steps - 1.0, 1.0);
      hsv.y = clamp(hsv.y * uSaturation, 0.0, 1.0);
      hsv.z = clamp(hsv.z * uBrightness, 0.0, 1.0);
      col = hsv2rgb(hsv);

      // 3) Sobel edge detection on ORIGINAL image (luminance + chrominance)
      vec2 e = px * uEdgeWidth;
      vec3 s00 = texture2D(uTexture, vUv + vec2(-e.x, -e.y)).rgb;
      vec3 s10 = texture2D(uTexture, vUv + vec2( 0.0, -e.y)).rgb;
      vec3 s20 = texture2D(uTexture, vUv + vec2( e.x, -e.y)).rgb;
      vec3 s01 = texture2D(uTexture, vUv + vec2(-e.x,  0.0)).rgb;
      vec3 s21 = texture2D(uTexture, vUv + vec2( e.x,  0.0)).rgb;
      vec3 s02 = texture2D(uTexture, vUv + vec2(-e.x,  e.y)).rgb;
      vec3 s12 = texture2D(uTexture, vUv + vec2( 0.0,  e.y)).rgb;
      vec3 s22 = texture2D(uTexture, vUv + vec2( e.x,  e.y)).rgb;

      // Luminance Sobel
      float lL00 = luma(s00), lL10 = luma(s10), lL20 = luma(s20);
      float lL01 = luma(s01),                    lL21 = luma(s21);
      float lL02 = luma(s02), lL12 = luma(s12), lL22 = luma(s22);
      float gxL = -lL00 + lL20 - 2.0*lL01 + 2.0*lL21 - lL02 + lL22;
      float gyL = -lL00 - 2.0*lL10 - lL20 + lL02 + 2.0*lL12 + lL22;
      float edgeL = sqrt(gxL*gxL + gyL*gyL);

      // Chrominance Sobel (catches equal-brightness colour boundaries)
      vec3 gxC = -s00 + s20 - 2.0*s01 + 2.0*s21 - s02 + s22;
      vec3 gyC = -s00 - 2.0*s10 - s20 + s02 + 2.0*s12 + s22;
      float edgeC = length(gxC) + length(gyC);

      float edge = max(edgeL * 1.5, edgeC * 0.5);

      // 4) Crisp inked edge with soft ramp
      float ink = smoothstep(uEdgeThreshold, uEdgeThreshold + uEdgeSoftness, edge);
      ink *= uEdgeStrength;

      col = mix(col, uEdgeColor, ink);

      gl_FragColor = vec4(col, src.a);
    }`,
};