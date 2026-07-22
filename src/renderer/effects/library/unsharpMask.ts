import type { EffectModule } from './types';
import { def, param } from './types';

// ---------------------------------------------------------------------------
// Edge-aware (bilateral-ish) separable blur.
// Unlike a plain Gaussian, samples are weighted both by spatial distance AND
// by how similar their luminance is to the center pixel. This keeps strong
// edges intact in the "low frequency" layer, which means the high-frequency
// (detail) layer doesn't pick up the edge itself — dramatically reducing
// halo artifacts around hard contrast boundaries without needing clip clamps.
// ---------------------------------------------------------------------------
const BILATERAL_FRAG = (axis: 'x' | 'y') => `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uR;
uniform float uEdgeSigma;
varying vec2 vUv;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  float sigma       = max(uR, 0.5);
  float invSpatial  = 1.0 / (2.0 * sigma * sigma);
  float edgeSigma   = max(uEdgeSigma, 0.001);
  float invRange    = 1.0 / (2.0 * edgeSigma * edgeSigma);
  float taps        = min(ceil(sigma * 3.0), 16.0);

  vec4  center     = texture2D(uTexture, vUv);
  float centerLuma = luma(center.rgb);

  vec4  sum  = center;
  float wsum = 1.0;

  for (int i = 1; i <= 16; i++) {
    if (float(i) > taps) break;
    float fi = float(i);
    vec2 off = ${axis === 'x'
      ? 'vec2(fi / uResolution.x, 0.0)'
      : 'vec2(0.0, fi / uResolution.y)'};

    vec4 sA = texture2D(uTexture, vUv + off);
    vec4 sB = texture2D(uTexture, vUv - off);

    float wSpatial = exp(-fi * fi * invSpatial);

    float dA = luma(sA.rgb) - centerLuma;
    float dB = luma(sB.rgb) - centerLuma;

    float wA = wSpatial * exp(-(dA * dA) * invRange);
    float wB = wSpatial * exp(-(dB * dB) * invRange);

    sum  += sA * wA + sB * wB;
    wsum += wA + wB;
  }

  gl_FragColor = sum / wsum;
}`;

const BLUR_H = BILATERAL_FRAG('x');
const BLUR_V = BILATERAL_FRAG('y');

// ---------------------------------------------------------------------------
// Composite pass: works in YCbCr so sharpening acts on luminance detail only
// by default (no color fringing), with an optional "saturation link" that
// re-injects a fraction of the same high-frequency energy into chroma for a
// punchier, more "acutance"-like look. Highlight/shadow protection is a soft
// luminance-based rolloff rather than a hard clip multiplier.
// ---------------------------------------------------------------------------
const UNSHARP_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uBlurred;
uniform float uAmount;
uniform float uThreshold;
uniform float uThreshFeather;
uniform float uHighlightProtect;
uniform float uShadowProtect;
uniform float uSaturationLink;
uniform float uShowMask;
varying vec2 vUv;

const mat3 RGB2YCbCr = mat3(
   0.2126,  -0.114572,   0.5,
   0.7152,  -0.385428,  -0.454153,
   0.0722,   0.5,       -0.045847
);
const mat3 YCbCr2RGB = mat3(
  1.0,        1.0,       1.0,
  0.0,       -0.187324,  1.8556,
  1.5748,    -0.468124,  0.0
);

void main() {
  vec4 orig = texture2D(uTexture, vUv);
  vec4 blur = texture2D(uBlurred, vUv);

  vec3 yOrig = RGB2YCbCr * orig.rgb;
  vec3 yBlur = RGB2YCbCr * blur.rgb;

  float hf     = yOrig.x - yBlur.x;
  float absHf  = abs(hf);

  float feather = max(uThreshFeather, 1e-4);
  float mask    = smoothstep(uThreshold, uThreshold + feather, absHf);

  // Soft rolloff based on the *base* (blurred) luminance so we ease off
  // sharpening near clipped highlights / crushed shadows instead of hard-clipping.
  float baseL = yBlur.x;
  float highlightFactor = mix(1.0, 1.0 - smoothstep(0.7, 1.0, baseL), uHighlightProtect);
  float shadowFactor    = mix(1.0, 1.0 - smoothstep(0.3, 0.0, baseL), uShadowProtect);
  float protect = highlightFactor * shadowFactor;

  float gain = uAmount * mask * protect;

  float sharpenedY = yOrig.x + hf * gain;
  vec2  chromaDelta = (yOrig.yz - yBlur.yz) * gain * uSaturationLink;
  vec2  sharpenedCbCr = yOrig.yz + chromaDelta;

  vec3 rgbOut = YCbCr2RGB * vec3(sharpenedY, sharpenedCbCr);

  if (uShowMask > 0.5) {
    gl_FragColor = vec4(vec3(mask * protect), 1.0);
    return;
  }

  gl_FragColor = vec4(clamp(rgbOut, 0.0, 1.0), orig.a);
}`;

export const unsharpMaskEffect: EffectModule = {
  definition: def(
    'unsharpMask',
    'Unsharp Mask',
    'blurSharpen',
    'Edge-aware, halo-resistant sharpening with luminance-only detail and chroma linking.',
    3,
    [
      param({ id: 'radius',            name: 'Radius',              value: 2,    defaultValue: 2,    min: 0.3,   max: 20,  step: 0.1,   uniform: 'uR' }),
      param({ id: 'edgeSigma',         name: 'Edge Sensitivity',    value: 0.12, defaultValue: 0.12, min: 0.01,  max: 1,   step: 0.01,  uniform: 'uEdgeSigma' }),
      param({ id: 'amount',            name: 'Amount',              value: 1.0,  defaultValue: 1.0,  min: 0,     max: 5,   step: 0.05,  uniform: 'uAmount' }),
      param({ id: 'threshold',         name: 'Threshold',           value: 0.02, defaultValue: 0.02, min: 0,     max: 0.5, step: 0.005, uniform: 'uThreshold' }),
      param({ id: 'threshFeather',     name: 'Threshold Feather',   value: 0.03, defaultValue: 0.03, min: 0.001, max: 0.3, step: 0.005, uniform: 'uThreshFeather' }),
      param({ id: 'highlightProtect',  name: 'Highlight Protect',   value: 0.5,  defaultValue: 0.5,  min: 0,     max: 1,   step: 0.05,  uniform: 'uHighlightProtect' }),
      param({ id: 'shadowProtect',     name: 'Shadow Protect',      value: 0.5,  defaultValue: 0.5,  min: 0,     max: 1,   step: 0.05,  uniform: 'uShadowProtect' }),
      param({ id: 'saturationLink',    name: 'Chroma Link',         value: 0.0,  defaultValue: 0.0,  min: 0,     max: 1,   step: 0.01,  uniform: 'uSaturationLink' }),
      param({ id: 'showMask',          name: 'Show Edge Mask',      type: 'boolean', value: false, defaultValue: false, uniform: 'uShowMask' }),
    ],
  ),

  fragmentShader: undefined as any,

  customRender: (ctx) => {
    const { instance, readTexture, writeTarget, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;

    const radius           = (get('radius')           as number)  ?? 2;
    const edgeSigma         = (get('edgeSigma')        as number)  ?? 0.12;
    const amount            = (get('amount')           as number)  ?? 1;
    const threshold          = (get('threshold')       as number)  ?? 0.02;
    const threshFeather       = (get('threshFeather')  as number)  ?? 0.03;
    const highlightProtect     = (get('highlightProtect') as number) ?? 0.5;
    const shadowProtect         = (get('shadowProtect')   as number) ?? 0.5;
    const saturationLink         = (get('saturationLink') as number) ?? 0.0;
    const showMask                = (get('showMask')       as boolean) ?? false;

    // Pass 1: horizontal edge-aware blur
    const t1 = acquireScratch(width, height);
    const m1 = getMaterial('usm_bh', BLUR_H, { uR: { value: radius }, uEdgeSigma: { value: edgeSigma } });
    m1.uniforms.uTexture.value = readTexture;
    m1.uniforms.uResolution.value.set(width, height);
    m1.uniforms.uR.value = radius;
    m1.uniforms.uEdgeSigma.value = edgeSigma;
    renderPass(m1, t1);

    // Pass 2: vertical edge-aware blur
    const t2 = acquireScratch(width, height);
    const m2 = getMaterial('usm_bv', BLUR_V, { uR: { value: radius }, uEdgeSigma: { value: edgeSigma } });
    m2.uniforms.uTexture.value = t1.texture;
    m2.uniforms.uResolution.value.set(width, height);
    m2.uniforms.uR.value = radius;
    m2.uniforms.uEdgeSigma.value = edgeSigma;
    renderPass(m2, t2);

    // Pass 3: YCbCr unsharp composite
    const m3 = getMaterial('usm_comp', UNSHARP_FRAG, {
      uBlurred:          { value: t2.texture },
      uAmount:           { value: amount },
      uThreshold:        { value: threshold },
      uThreshFeather:    { value: threshFeather },
      uHighlightProtect: { value: highlightProtect },
      uShadowProtect:    { value: shadowProtect },
      uSaturationLink:   { value: saturationLink },
      uShowMask:         { value: showMask ? 1 : 0 },
    });
    m3.uniforms.uTexture.value        = readTexture;
    m3.uniforms.uBlurred.value        = t2.texture;
    m3.uniforms.uAmount.value         = amount;
    m3.uniforms.uThreshold.value      = threshold;
    m3.uniforms.uThreshFeather.value  = threshFeather;
    m3.uniforms.uHighlightProtect.value = highlightProtect;
    m3.uniforms.uShadowProtect.value    = shadowProtect;
    m3.uniforms.uSaturationLink.value   = saturationLink;
    m3.uniforms.uShowMask.value         = showMask ? 1 : 0;
    renderPass(m3, writeTarget);
  },
};