import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;

uniform vec3 uKeyColor;
uniform float uSimilarity;
uniform float uSmoothness;
uniform float uSpill;
uniform float uSpillDesat;
uniform vec3 uEdgeColor;
uniform float uEdgeColorAmount;

uniform float uMatteChoke;
uniform float uMatteBlur;
uniform float uBlackClip;
uniform float uWhiteClip;

uniform float uLumaProtect;
uniform float uSatBoost;

uniform float uPreview;

varying vec2 vUv;

vec2 rgbToUV(vec3 rgb) {
  return vec2(
    rgb.r * -0.169 + rgb.g * -0.331 + rgb.b *  0.500 + 0.5,
    rgb.r *  0.500 + rgb.g * -0.419 + rgb.b * -0.081 + 0.5
  );
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float computeMask(vec2 uv) {
  vec3 src = texture2D(uTexture, uv).rgb;
  vec2 kUV = rgbToUV(uKeyColor);
  vec2 sUV = rgbToUV(src);
  float dist = distance(kUV, sUV);
  float sm = max(uSmoothness, 0.0001);
  return smoothstep(uSimilarity, uSimilarity + sm, dist);
}

float blurredMask(vec2 uv, vec2 px) {
  float r = uMatteBlur;
  if (r < 0.01) return computeMask(uv);
  vec2 o = px * r;
  float m = computeMask(uv) * 0.36;
  m += computeMask(uv + vec2(-o.x, 0.0)) * 0.16;
  m += computeMask(uv + vec2( o.x, 0.0)) * 0.16;
  m += computeMask(uv + vec2( 0.0,-o.y)) * 0.16;
  m += computeMask(uv + vec2( 0.0, o.y)) * 0.16;
  return m;
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec4 src = texture2D(uTexture, vUv);

  float mask = blurredMask(vUv, px);

  mask = clamp((mask - 0.5) * (1.0 + uMatteChoke * 2.0) + 0.5, 0.0, 1.0);

  mask = smoothstep(uBlackClip, 1.0 - uWhiteClip, mask);

  if (uLumaProtect > 0.001) {
    float srcLuma = luma(src.rgb);
    float keyLuma = luma(uKeyColor);
    float lumaDiff = abs(srcLuma - keyLuma);
    float protect = smoothstep(0.15, 0.45, lumaDiff);
    mask = max(mask, protect * uLumaProtect);
  }

  vec2 kUV = rgbToUV(uKeyColor);
  vec2 sUV = rgbToUV(src.rgb);
  float distUV = distance(kUV, sUV);
  float spillZone = 1.0 - smoothstep(uSimilarity, uSimilarity + 0.3, distUV);
  spillZone *= mask;

  vec3 col = src.rgb;

  vec3 spillCol = uKeyColor * spillZone * uSpill;
  col = max(col - spillCol, 0.0);

  if (uSpillDesat > 0.001) {
    vec3 hsv = rgb2hsv(col);
    vec3 keyHsv = rgb2hsv(uKeyColor);
    float hueDist = abs(hsv.x - keyHsv.x);
    hueDist = min(hueDist, 1.0 - hueDist);
    float nearKeyHue = 1.0 - smoothstep(0.0, 0.12, hueDist);
    hsv.y *= 1.0 - nearKeyHue * uSpillDesat * spillZone;
    col = hsv2rgb(hsv);
  }

  if (uEdgeColorAmount > 0.001) {
    float edgeMask = spillZone * uEdgeColorAmount;
    col = mix(col, mix(col, uEdgeColor, 0.7), edgeMask);
  }

  if (abs(uSatBoost) > 0.001) {
    vec3 hsv = rgb2hsv(col);
    hsv.y = clamp(hsv.y * (1.0 + uSatBoost), 0.0, 1.0);
    col = hsv2rgb(hsv);
  }

  int pv = int(uPreview + 0.5);

  if (pv == 1) {
    gl_FragColor = vec4(vec3(mask), 1.0);
    return;
  }
  if (pv == 2) {
    vec3 red = vec3(1.0, 0.0, 0.0);
    vec3 comp = mix(red, col, mask);
    gl_FragColor = vec4(comp, 1.0);
    return;
  }
  if (pv == 3) {
    vec2 checkUv = floor(vUv * uResolution / 16.0);
    float checker = mod(checkUv.x + checkUv.y, 2.0);
    vec3 bg = vec3(mix(0.25, 0.5, checker));
    vec3 comp = mix(bg, col, mask);
    gl_FragColor = vec4(comp, 1.0);
    return;
  }

  gl_FragColor = vec4(col, src.a * mask);
}
`;

export const chromaKeyEffect: EffectModule = {
  definition: def(
    'chromaKey',
    'Chroma Key',
    'color',
    'Broadcast-grade green/blue screen keyer with spill suppression, edge tools and matte preview.',
    1,
    [
      param({ id: 'keyColor',   name: 'Key Color', type: 'color', value: '#00ff00', defaultValue: '#00ff00', uniform: 'uKeyColor' }),
      param({ id: 'similarity', name: 'Similarity', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.005, uniform: 'uSimilarity' }),
      param({ id: 'smoothness', name: 'Smoothness', value: 0.1, defaultValue: 0.1, min: 0, max: 1, step: 0.005, uniform: 'uSmoothness' }),

      param({ id: 'spill',      name: 'Spill Suppress',   value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uSpill' }),
      param({ id: 'spillDesat', name: 'Spill Desaturate', value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uSpillDesat' }),

      param({ id: 'edgeColor',       name: 'Edge Color', type: 'color', value: '#e0b090', defaultValue: '#e0b090', uniform: 'uEdgeColor' }),
      param({ id: 'edgeColorAmount', name: 'Edge Color Amount', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uEdgeColorAmount' }),

      param({ id: 'matteChoke', name: 'Matte Choke', value: 0,    defaultValue: 0,    min: -1, max: 1, step: 0.01, uniform: 'uMatteChoke' }),
      param({ id: 'matteBlur',  name: 'Matte Blur',  value: 0.5,  defaultValue: 0.5,  min: 0, max: 5, step: 0.1, uniform: 'uMatteBlur' }),
      param({ id: 'blackClip',  name: 'Black Clip',  value: 0.05, defaultValue: 0.05, min: 0, max: 0.5, step: 0.005, uniform: 'uBlackClip' }),
      param({ id: 'whiteClip',  name: 'White Clip',  value: 0.05, defaultValue: 0.05, min: 0, max: 0.5, step: 0.005, uniform: 'uWhiteClip' }),

      param({ id: 'lumaProtect', name: 'Luma Protect',      value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uLumaProtect' }),
      param({ id: 'satBoost',    name: 'Saturation Boost', value: 0, defaultValue: 0, min: -1, max: 1, step: 0.01, uniform: 'uSatBoost' }),

      param({ id: 'preview', name: 'View', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Final',           value: 0 },
          { label: 'Matte',           value: 1 },
          { label: 'Matte over Red',  value: 2 },
          { label: 'On Checkerboard', value: 3 },
        ], uniform: 'uPreview' }),
    ],
  ),
  fragmentShader: FRAG,
};