import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;

uniform float uStyle;
uniform float uPixelSize;
uniform float uSubpixelIntensity;
uniform float uGap;
uniform float uGapDarkness;
uniform float uBrightness;
uniform float uSaturation;
uniform float uBloom;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uCurvature;
uniform float uVignette;
uniform float uAberration;
uniform float uNoise;
uniform float uMix;
uniform float uTime;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 sampleBloom(vec2 uv, vec2 px) {
  vec3 s = texture2D(uTexture, uv).rgb;
  s += texture2D(uTexture, uv + vec2( px.x, 0.0)).rgb;
  s += texture2D(uTexture, uv + vec2(-px.x, 0.0)).rgb;
  s += texture2D(uTexture, uv + vec2(0.0,  px.y)).rgb;
  s += texture2D(uTexture, uv + vec2(0.0, -px.y)).rgb;
  return s / 5.0;
}

// Barrel distortion for CRT curvature
vec2 curveUv(vec2 uv, float amount) {
  if (amount < 0.001) return uv;
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  c *= 1.0 + r2 * amount;
  return c + 0.5;
}

struct Cfg {
  float pixelSize;
  float subpixel;
  float gap;
  float gapDark;
  float brightness;
  float saturation;
  float bloom;
  float scanIntensity;
  float scanCount;
  float curvature;
  float vignette;
  float aberration;
  float noise;
};

Cfg presetRGBStripe() {
  return Cfg(8.0, 1.0, 0.15, 0.6, 1.15, 1.1, 0.4, 0.0, 0.0, 0.0, 0.2, 0.0, 0.02);
}
Cfg presetLEDMatrix() {
  return Cfg(12.0, 1.2, 0.35, 0.9, 1.3, 1.2, 0.6, 0.0, 0.0, 0.0, 0.15, 0.0, 0.0);
}
Cfg presetCRT() {
  return Cfg(6.0, 0.8, 0.2, 0.4, 1.2, 1.15, 0.7, 0.35, 240.0, 0.15, 0.35, 0.15, 0.05);
}
Cfg presetGameBoy() {
  return Cfg(10.0, 0.0, 0.25, 0.7, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.03);
}
Cfg presetChunky() {
  return Cfg(24.0, 1.4, 0.4, 0.95, 1.35, 1.25, 0.8, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0);
}
Cfg presetTinyBloom() {
  return Cfg(3.0, 0.6, 0.1, 0.3, 1.1, 1.05, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
}
Cfg presetCustom() {
  return Cfg(uPixelSize, uSubpixelIntensity, uGap, uGapDarkness, uBrightness, uSaturation, uBloom, uScanlineIntensity, uScanlineCount, uCurvature, uVignette, uAberration, uNoise);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetRGBStripe();
  if (s == 1) return presetLEDMatrix();
  if (s == 2) return presetCRT();
  if (s == 3) return presetGameBoy();
  if (s == 4) return presetChunky();
  if (s == 5) return presetTinyBloom();
  return presetCustom();
}

vec3 saturate3(vec3 c, float s) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), c, s);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  // ---- Curvature (screen bulge) ----
  vec2 uv = curveUv(vUv, cfg.curvature);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, src.a);
    return;
  }

  // ---- Compute the pixel cell we belong to ----
  float pxSize = max(cfg.pixelSize, 1.0);
  vec2 pixelGrid = uResolution / pxSize;
  vec2 cellId  = floor(uv * pixelGrid);
  vec2 cellUv  = fract(uv * pixelGrid);              // 0..1 within cell
  vec2 cellCenter = (cellId + 0.5) / pixelGrid;

  // ---- Sample the "logical pixel" color at the cell center ----
  vec2 px = 1.0 / uResolution;
  vec3 pixColor;
  if (cfg.bloom > 0.01) {
    vec3 base = texture2D(uTexture, cellCenter).rgb;
    vec3 blur = sampleBloom(cellCenter, px * pxSize * 0.5);
    pixColor = mix(base, blur, cfg.bloom * 0.5) + blur * cfg.bloom * 0.5;
  } else {
    pixColor = texture2D(uTexture, cellCenter).rgb;
  }

  // Chromatic aberration on sampled color
  if (cfg.aberration > 0.001) {
    vec2 aOff = px * pxSize * cfg.aberration * 2.0;
    pixColor.r = texture2D(uTexture, cellCenter + aOff).r;
    pixColor.b = texture2D(uTexture, cellCenter - aOff).b;
  }

  pixColor = saturate3(pixColor, cfg.saturation);
  pixColor *= cfg.brightness;

  // ---- Subpixel layout: R | G | B stripes across the cell width ----
  vec3 subMask = vec3(0.0);
  float subX = cellUv.x * 3.0;
  int stripe = int(floor(subX));
  if (stripe == 0) subMask = vec3(1.0, 0.0, 0.0);
  else if (stripe == 1) subMask = vec3(0.0, 1.0, 0.0);
  else subMask = vec3(0.0, 0.0, 1.0);

  // Rounded subpixel: fade edges of each stripe
  float subFrac = fract(subX);
  float subShape = smoothstep(0.0, 0.15, subFrac) * (1.0 - smoothstep(0.85, 1.0, subFrac));
  subMask *= subShape;

  // ---- Grid gap (dark space between cells) ----
  float gapEdge = cfg.gap * 0.5;
  vec2 gapMask2 = smoothstep(vec2(0.0), vec2(gapEdge), cellUv) *
                  (1.0 - smoothstep(vec2(1.0 - gapEdge), vec2(1.0), cellUv));
  float gapMask = gapMask2.x * gapMask2.y;
  gapMask = mix(1.0, gapMask, cfg.gapDark);

  // ---- Combine sub-pixel structure with source color ----
  vec3 subpixColor = pixColor * subMask * 3.0; // *3 because only 1/3 of the light per stripe
  vec3 flatColor   = pixColor;                  // no subpixel case

  vec3 monitorColor = mix(flatColor, subpixColor, clamp(cfg.subpixel, 0.0, 1.5));
  monitorColor *= gapMask;

  // ---- Scanlines ----
  if (cfg.scanIntensity > 0.001) {
    float scanLine = 0.5 + 0.5 * cos(uv.y * cfg.scanCount * 3.14159);
    monitorColor *= mix(1.0, scanLine, cfg.scanIntensity);
  }

  // ---- Vignette ----
  if (cfg.vignette > 0.001) {
    float v = length(vUv - 0.5) * 1.414;
    float vig = 1.0 - smoothstep(0.5, 1.0, v) * cfg.vignette;
    monitorColor *= vig;
  }

  // ---- Noise ----
  if (cfg.noise > 0.001) {
    float n = hash(vUv * uResolution + uTime * 0.1) - 0.5;
    monitorColor += vec3(n) * cfg.noise;
  }

  vec3 result = mix(src.rgb, monitorColor, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(clamp(result, 0.0, 1.5), src.a);
}
`;

export const superLEDEffect: EffectModule = {
  definition: def(
    'superLED',
    'Pixel Monitor',
    'stylize',
    'CRT / LED / RGB subpixel display simulation. See the source as if magnified on a real screen.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Style Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'RGB Stripe (LCD)',   value: 0 },
          { label: 'LED Matrix (billboard)', value: 1 },
          { label: 'CRT (old TV)',       value: 2 },
          { label: 'Game Boy (mono)',    value: 3 },
          { label: 'Chunky Pixels',      value: 4 },
          { label: 'Tiny Bloom',         value: 5 },
          { label: 'Custom',             value: 6 },
        ], uniform: 'uStyle' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'time', name: 'Noise Time', value: 0, defaultValue: 0, min: 0, max: 1000, step: 0.1, uniform: 'uTime' }),

      // ===== CUSTOM: Pixel Grid =====
      param({ id: 'pixelSize', name: 'Custom: Pixel Size (px)', value: 8, defaultValue: 8, min: 2, max: 64, step: 1, uniform: 'uPixelSize' }),
      param({ id: 'subpixelIntensity', name: 'Custom: Subpixel Amount', value: 1.0, defaultValue: 1.0, min: 0, max: 1.5, step: 0.01, uniform: 'uSubpixelIntensity' }),
      param({ id: 'gap', name: 'Custom: Gap Size', value: 0.2, defaultValue: 0.2, min: 0, max: 0.5, step: 0.01, uniform: 'uGap' }),
      param({ id: 'gapDarkness', name: 'Custom: Gap Darkness', value: 0.7, defaultValue: 0.7, min: 0, max: 1, step: 0.01, uniform: 'uGapDarkness' }),

      // ===== CUSTOM: Color =====
      param({ id: 'brightness', name: 'Custom: Brightness', value: 1.2, defaultValue: 1.2, min: 0.3, max: 3, step: 0.05, uniform: 'uBrightness' }),
      param({ id: 'saturation', name: 'Custom: Saturation', value: 1.1, defaultValue: 1.1, min: 0, max: 3, step: 0.05, uniform: 'uSaturation' }),
      param({ id: 'bloom', name: 'Custom: Bloom', value: 0.4, defaultValue: 0.4, min: 0, max: 2, step: 0.05, uniform: 'uBloom' }),
      param({ id: 'aberration', name: 'Custom: Chromatic Aberration', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uAberration' }),

      // ===== CUSTOM: CRT-style =====
      param({ id: 'scanlineIntensity', name: 'Custom: Scanline Intensity', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uScanlineIntensity' }),
      param({ id: 'scanlineCount', name: 'Custom: Scanline Count', value: 200, defaultValue: 200, min: 50, max: 800, step: 10, uniform: 'uScanlineCount' }),
      param({ id: 'curvature', name: 'Custom: Screen Curvature', value: 0, defaultValue: 0, min: 0, max: 0.6, step: 0.01, uniform: 'uCurvature' }),
      param({ id: 'vignette', name: 'Custom: Vignette', value: 0.15, defaultValue: 0.15, min: 0, max: 1, step: 0.01, uniform: 'uVignette' }),
      param({ id: 'noise', name: 'Custom: Noise', value: 0.02, defaultValue: 0.02, min: 0, max: 0.3, step: 0.005, uniform: 'uNoise' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};