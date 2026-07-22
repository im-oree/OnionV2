import type { EffectModule } from './types';
import { def, param } from './types';

const GLITCH_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uTime;
uniform float uAutoAnimate;
uniform float uSpeed;
uniform float uProgress;
uniform float uAmount;
uniform float uStyle;
uniform float uBlockSize;
uniform float uRgbShift;
uniform float uScanlineIntensity;
uniform float uNoiseAmount;
uniform float uJitter;
uniform float uSeed;
varying vec2 vUv;

// -------- hash helpers --------
float hash11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float hash21(vec2 p)  { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2  hash22(vec2 p)  {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453) - 0.5;
}

vec4 safeSample(vec2 uv) {
  vec2 c = clamp(uv, 0.0, 1.0);
  return texture2D(uTexture, c);
}

void main() {
  // Time source (auto or manual)
  float t = mix(uProgress, uTime * uSpeed, step(0.5, uAutoAnimate));
  // Quantise time so glitches "step" between frames like real digital corruption
  float tq = floor(t * 12.0) / 12.0 + uSeed;

  vec2 uv = vUv;
  int style = int(uStyle + 0.5);

  // Global glitch trigger - stronger glitches happen in bursts
  float burst = hash11(floor(tq * 3.0));
  float burstActive = smoothstep(0.6, 0.9, burst);
  float amt = uAmount * (0.4 + burstActive * 0.6);

  // ============ STYLE 0: DIGITAL BLOCK CORRUPTION ============
  if (style == 0) {
    // Break screen into horizontal rows of glitch bands
    float row = floor(uv.y * uResolution.y / uBlockSize);
    float rowNoise = hash11(row * 0.31 + tq);
    // Not every row glitches - only ones above threshold
    float rowActive = step(1.0 - amt * 0.5, rowNoise);
    float shift = (hash11(row + tq * 1.7) - 0.5) * amt * 0.3 * rowActive;
    uv.x += shift;

    // Block displacement - some rows get replaced with content from elsewhere
    if (rowActive > 0.5 && hash11(row + tq * 2.3) > 0.6) {
      uv.y = fract(uv.y + (hash11(row + tq * 4.1) - 0.5) * 0.2);
    }
  }
  // ============ STYLE 1: VHS TRACKING / ANALOG ============
  else if (style == 1) {
    // Slow wavy horizontal shift (tape tension)
    float wave = sin(uv.y * 60.0 + t * 3.0) * 0.002;
    wave     += sin(uv.y * 200.0 + t * 7.0) * 0.001;
    uv.x     += wave * amt * 10.0;

    // Big tracking band that scrolls vertically
    float band = smoothstep(0.02, 0.0, abs(fract(uv.y - t * 0.15) - 0.5));
    uv.x += band * amt * 0.05 * sin(t * 20.0);

    // Fine horizontal jitter every scanline
    float scan = hash11(floor(uv.y * uResolution.y) + tq);
    uv.x += (scan - 0.5) * amt * 0.004;
  }
  // ============ STYLE 2: DATA MOSH / KEYFRAME BREAK ============
  else if (style == 2) {
    // Big rectangular chunks get displaced in random directions
    vec2 blockGrid = vec2(uBlockSize * 2.0, uBlockSize) / uResolution;
    vec2 block = floor(uv / blockGrid);
    vec2 blockNoise = hash22(block + tq);
    float blockActive = step(0.5, hash21(block * 0.7 + tq) - (0.7 - amt));
    uv += blockNoise * amt * 0.15 * blockActive;
  }
  // ============ STYLE 3: SCANLINE TEAR ============
  else if (style == 3) {
    // Every N pixels, a horizontal line gets shifted
    float line = floor(uv.y * uResolution.y);
    float lineNoise = hash11(line + tq * 3.0);
    float active = step(0.85 - amt * 0.4, lineNoise);
    float shift = (hash11(line * 1.3 + tq) - 0.5) * amt * 0.4 * active;
    uv.x += shift;
  }
  // ============ STYLE 4: SIGNAL LOSS / DROPOUT ============
  else if (style == 4) {
    // Chunks of the image get inverted or blacked out
    float row = floor(uv.y * uResolution.y / (uBlockSize * 1.5));
    float rowRnd = hash11(row + tq * 1.5);
    if (rowRnd > 1.0 - amt * 0.3) {
      uv.x = fract(uv.x + hash11(row + tq * 2.7) * 0.5);
    }
  }
  // ============ STYLE 5: PIXEL SORT / SLICE ============
  else if (style == 5) {
    float slice = floor(uv.y * uResolution.y / uBlockSize);
    float sliceRnd = hash11(slice + tq);
    if (sliceRnd > 1.0 - amt) {
      // Stretch this row from a single sample point
      float sampleX = hash11(slice * 1.7 + tq);
      uv.x = mix(uv.x, sampleX, hash11(slice * 2.3 + tq) * amt);
    }
  }

  // Random full-frame jitter
  vec2 jitter = (hash22(vec2(tq * 3.7, tq * 1.9))) * uJitter * amt * 0.01;
  uv += jitter;

  // ---- RGB SHIFT (chromatic split from glitching) ----
  float rgbBurst = amt * uRgbShift * (0.5 + burstActive);
  float rShift = (hash11(tq * 5.1) - 0.5) * rgbBurst * 0.02;
  float bShift = (hash11(tq * 7.3) - 0.5) * rgbBurst * 0.02;

  float r = safeSample(uv + vec2(rShift, 0.0)).r;
  float g = safeSample(uv).g;
  float b = safeSample(uv + vec2(bShift, 0.0)).b;
  float a = safeSample(uv).a;
  vec3 col = vec3(r, g, b);

  // ---- SCANLINES ----
  if (uScanlineIntensity > 0.001) {
    float scan = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 3.14159);
    col *= mix(1.0, scan, uScanlineIntensity);
  }

  // ---- COLOR NOISE ----
  if (uNoiseAmount > 0.001) {
    float n = hash21(vUv * uResolution + tq * 100.0) - 0.5;
    col += vec3(n) * uNoiseAmount * 0.3;
  }

  gl_FragColor = vec4(col, a);
}`;

export const glitchEffect: EffectModule = {
  definition: def(
    'glitch',
    'Glitch',
    'stylize',
    'Multi-style digital / analog glitch with auto or manual timing.',
    1,
    [
      // ---- Style ----
      param({ id: 'style', name: 'Glitch Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Digital Corruption', value: 0 },
          { label: 'VHS / Analog',       value: 1 },
          { label: 'Data Mosh',          value: 2 },
          { label: 'Scanline Tear',      value: 3 },
          { label: 'Signal Dropout',     value: 4 },
          { label: 'Pixel Slice',        value: 5 },
        ], uniform: 'uStyle' }),

      // ---- Main ----
      param({ id: 'amount', name: 'Amount', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uAmount' }),

      // ---- Timing ----
      param({ id: 'autoAnimate', name: 'Auto Animate', type: 'boolean', value: true, defaultValue: true, uniform: 'uAutoAnimate' }),
      param({ id: 'speed',    name: 'Speed',    value: 1.0, defaultValue: 1.0, min: 0, max: 20, step: 0.05, uniform: 'uSpeed' }),
      param({ id: 'progress', name: 'Progress (manual)', value: 0, defaultValue: 0, min: -1000, max: 1000, step: 0.01, uniform: 'uProgress' }),
      param({ id: 'seed',     name: 'Random Seed', value: 0, defaultValue: 0, min: 0, max: 100, step: 0.1, uniform: 'uSeed' }),

      // ---- Style-specific ----
      param({ id: 'blockSize', name: 'Block Size', value: 8, defaultValue: 8, min: 1, max: 64, step: 1, uniform: 'uBlockSize' }),
      param({ id: 'jitter',    name: 'Frame Jitter', value: 0.3, defaultValue: 0.3, min: 0, max: 5, step: 0.05, uniform: 'uJitter' }),

      // ---- Extras ----
      param({ id: 'rgbShift', name: 'RGB Shift', value: 1.0, defaultValue: 1.0, min: 0, max: 5, step: 0.05, uniform: 'uRgbShift' }),
      param({ id: 'scanlineIntensity', name: 'Scanlines', value: 0.0, defaultValue: 0.0, min: 0, max: 1, step: 0.01, uniform: 'uScanlineIntensity' }),
      param({ id: 'noiseAmount', name: 'Noise', value: 0.0, defaultValue: 0.0, min: 0, max: 1, step: 0.01, uniform: 'uNoiseAmount' }),
    ],
  ),
  fragmentShader: GLITCH_FRAG,
  usesTime: true,
};