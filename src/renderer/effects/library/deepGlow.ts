import type { EffectModule } from './types';
import { def, param } from './types';

/**
 * Deep Glow — physically accurate glow with inverse-square falloff,
 * chromatic aberration, HDR tone mapping, and unmult support.
 *
 * Multi-pass:
 *   Pass 1: Threshold + extract bright areas
 *   Pass 2: Horizontal blur with falloff
 *   Pass 3: Vertical blur with falloff
 *   Pass 4: Composite + chromatic aberration + tone map
 */

const EXTRACT_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uExposure;
uniform float uUnmult;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec4 color = src;

  // Unmult: remove pre-multiplied black fringe on transparent layers
  if (uUnmult > 0.5 && src.a > 0.001) {
    color.rgb /= src.a;
  }

  // Exposure boost
  color.rgb *= pow(2.0, uExposure);

  // Extract bright areas above threshold
  float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  float mask = smoothstep(uThreshold - 0.05, uThreshold + 0.05, lum);

  gl_FragColor = vec4(color.rgb * mask * color.a, color.a * mask);
}
`;

const BLUR_H_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uRadius;
varying vec2 vUv;

void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  float sigma = uRadius / 3.0;

  for (int i = -32; i <= 32; i++) {
    float x = float(i);
    // Inverse-square falloff weight
    float dist = abs(x);
    float w = 1.0 / (1.0 + dist * dist / (sigma * sigma));
    vec2 uv = vUv + vec2(x / uResolution.x, 0.0);
    uv = clamp(uv, 0.0, 1.0);
    color += texture2D(uTexture, uv) * w;
    total += w;
  }
  gl_FragColor = color / max(total, 0.001);
}
`;

const BLUR_V_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uRadius;
varying vec2 vUv;

void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  float sigma = uRadius / 3.0;

  for (int i = -32; i <= 32; i++) {
    float y = float(i);
    float dist = abs(y);
    float w = 1.0 / (1.0 + dist * dist / (sigma * sigma));
    vec2 uv = vUv + vec2(0.0, y / uResolution.y);
    uv = clamp(uv, 0.0, 1.0);
    color += texture2D(uTexture, uv) * w;
    total += w;
  }
  gl_FragColor = color / max(total, 0.001);
}
`;

const COMPOSITE_FRAG = `
precision highp float;
uniform sampler2D uTexture;      // original source
uniform sampler2D uGlow;         // blurred glow
uniform float uIntensity;
uniform vec3 uTint;
uniform float uChromaticAb;
uniform float uToneMap;          // 0=none 1=filmic 2=reinhard
uniform vec2 uResolution;
varying vec2 vUv;

vec3 filmicToneMap(vec3 x) {
  float A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

vec3 reinhardToneMap(vec3 x) {
  return x / (1.0 + x);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);

  // Chromatic aberration on glow
  vec4 glowColor;
  if (uChromaticAb > 0.001) {
    float ca = uChromaticAb * 0.01;
    float r = texture2D(uGlow, vUv + vec2( ca, 0.0)).r;
    float g = texture2D(uGlow, vUv).g;
    float b = texture2D(uGlow, vUv - vec2( ca, 0.0)).b;
    glowColor = vec4(r, g, b, texture2D(uGlow, vUv).a);
  } else {
    glowColor = texture2D(uGlow, vUv);
  }

  // Apply tint to glow
  vec3 glow = glowColor.rgb * uTint * uIntensity;

  // Composite: source + glow
  vec3 result = src.rgb + glow;

  // Tone mapping
  if (uToneMap > 1.5) {
    result = reinhardToneMap(result);
  } else if (uToneMap > 0.5) {
    result = filmicToneMap(result) / filmicToneMap(vec3(11.2));
  }

  gl_FragColor = vec4(result, max(src.a, glowColor.a));
}
`;

import * as THREE from 'three';
import type { EffectRenderContext } from './types';
import { DEFAULT_VERTEX_SHADER } from './types';

export const deepGlowEffect: EffectModule = {
  definition: def(
    'deepGlow',
    'Deep Glow',
    'stylize',
    'Physically accurate glow with inverse-square falloff, chromatic aberration, and HDR tone mapping.',
    4,
    [
      param({ id: 'threshold',    name: 'Threshold',    value: 0.5,  defaultValue: 0.5,  min: 0,   max: 1,   step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'radius',       name: 'Radius',       value: 40,   defaultValue: 40,   min: 1,   max: 200, step: 1,    uniform: 'uRadius' }),
      param({ id: 'intensity',    name: 'Intensity',    value: 2.0,  defaultValue: 2.0,  min: 0,   max: 10,  step: 0.1,  uniform: 'uIntensity' }),
      param({ id: 'exposure',     name: 'Exposure',     value: 0,    defaultValue: 0,    min: -4,  max: 4,   step: 0.1,  uniform: 'uExposure' }),
      param({ id: 'tint',         name: 'Tint',         type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uTint' }),
      param({ id: 'chromaticAb',  name: 'Chromatic Ab', value: 0,    defaultValue: 0,    min: 0,   max: 10,  step: 0.1,  uniform: 'uChromaticAb' }),
      param({ id: 'toneMap',      name: 'Tone Map',     type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'None',      value: 0 },
          { label: 'Filmic',    value: 1 },
          { label: 'Reinhard',  value: 2 },
        ], uniform: 'uToneMap' }),
      param({ id: 'unmult',       name: 'Unmult',       type: 'boolean', value: false, defaultValue: false, uniform: 'uUnmult' }),
    ],
  ),

  // No single fragmentShader — we use customRender for multi-pass
  fragmentShader: undefined as any,

  customRender(ctx: EffectRenderContext): void {
    const { renderer, instance, readTexture, writeTarget, width, height, getMaterial, acquireScratch, renderPass } = ctx;

    const getParam = (id: string) => instance.parameters.find(p => p.id === id)?.value;

    const threshold   = getParam('threshold')   as number ?? 0.5;
    const radius      = getParam('radius')      as number ?? 40;
    const intensity   = getParam('intensity')   as number ?? 2;
    const exposure    = getParam('exposure')    as number ?? 0;
    const tintHex     = getParam('tint')        as string ?? '#ffffff';
    const chromaticAb = getParam('chromaticAb') as number ?? 0;
    const toneMap     = getParam('toneMap')     as number ?? 0;
    const unmult      = getParam('unmult')      as boolean ?? false;

    const tintColor = new THREE.Color(tintHex);

    // Pass 1: Extract bright areas
    const extractTarget = acquireScratch(width, height);
    const extractMat = getMaterial('extract', EXTRACT_FRAG, {
      uThreshold: { value: threshold },
      uExposure:  { value: exposure },
      uUnmult:    { value: unmult ? 1.0 : 0.0 },
    });
    extractMat.uniforms.uTexture.value = readTexture;
    extractMat.uniforms.uThreshold.value = threshold;
    extractMat.uniforms.uExposure.value = exposure;
    (extractMat.uniforms as any).uUnmult.value = unmult ? 1.0 : 0.0;
    renderPass(extractMat, extractTarget);

    // Pass 2: Horizontal blur
    const blurHTarget = acquireScratch(width, height);
    const blurHMat = getMaterial('blurH', BLUR_H_FRAG, {
      uRadius: { value: radius },
    });
    blurHMat.uniforms.uTexture.value = extractTarget.texture;
    blurHMat.uniforms.uResolution.value.set(width, height);
    (blurHMat.uniforms as any).uRadius.value = radius;
    renderPass(blurHMat, blurHTarget);

    // Pass 3: Vertical blur
    const blurVTarget = acquireScratch(width, height);
    const blurVMat = getMaterial('blurV', BLUR_V_FRAG, {
      uRadius: { value: radius },
    });
    blurVMat.uniforms.uTexture.value = blurHTarget.texture;
    blurVMat.uniforms.uResolution.value.set(width, height);
    (blurVMat.uniforms as any).uRadius.value = radius;
    renderPass(blurVMat, blurVTarget);

    // Pass 4: Composite
    const compositeMat = getMaterial('composite', COMPOSITE_FRAG, {
      uGlow:       { value: blurVTarget.texture },
      uIntensity:  { value: intensity },
      uTint:       { value: tintColor },
      uChromaticAb:{ value: chromaticAb },
      uToneMap:    { value: toneMap },
    });
    compositeMat.uniforms.uTexture.value = readTexture;
    (compositeMat.uniforms as any).uGlow.value = blurVTarget.texture;
    (compositeMat.uniforms as any).uIntensity.value = intensity;
    if ((compositeMat.uniforms as any).uTint?.value instanceof THREE.Color) {
      (compositeMat.uniforms as any).uTint.value.set(tintHex);
    }
    (compositeMat.uniforms as any).uChromaticAb.value = chromaticAb;
    (compositeMat.uniforms as any).uToneMap.value = toneMap;
    compositeMat.uniforms.uResolution.value.set(width, height);
    renderPass(compositeMat, writeTarget);
  },
};