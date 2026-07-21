import type { EffectModule } from './types';
import { def, param } from './types';

/**
 * Glow — proper multi-pass bloom with Gaussian falloff.
 * Pass 1: Extract bright areas + horizontal blur
 * Pass 2: Vertical blur
 * Pass 3: Composite with source
 */
const BLUR_H = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  float sigma = max(uRadius / 3.0, 0.001);
  for (int i = -16; i <= 16; i++) {
    float x = float(i);
    float w = exp(-0.5 * x * x / (sigma * sigma));
    vec2 uv = vUv + vec2(x / uResolution.x, 0.0);
    uv = clamp(uv, 0.0, 1.0);
    color += texture2D(uTexture, uv) * w;
    total += w;
  }
  gl_FragColor = color / max(total, 0.001);
}`;

const BLUR_V = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  float sigma = max(uRadius / 3.0, 0.001);
  for (int i = -16; i <= 16; i++) {
    float y = float(i);
    float w = exp(-0.5 * y * y / (sigma * sigma));
    vec2 uv = vUv + vec2(0.0, y / uResolution.y);
    uv = clamp(uv, 0.0, 1.0);
    color += texture2D(uTexture, uv) * w;
    total += w;
  }
  gl_FragColor = color / max(total, 0.001);
}`;

const EXTRACT = `
precision highp float;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(uTexture, vUv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  float mask = smoothstep(uThreshold - 0.1, uThreshold + 0.1, lum);
  vec3 glow = s.rgb * uColor * mask;
  gl_FragColor = vec4(glow, s.a * mask);
}`;

const COMPOSITE = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uGlow;
uniform float uIntensity;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec4 glow = texture2D(uGlow, vUv);
  vec3 result = src.rgb + glow.rgb * uTint * uIntensity;
  gl_FragColor = vec4(result, max(src.a, glow.a));
}`;

export const glowEffect: EffectModule = {
  definition: def(
    'glow',
    'Glow',
    'stylize',
    'Smooth Gaussian glow around bright areas.',
    3, // 3-pass: extract + blurH + blurV + composite
    [
      param({ id: 'threshold', name: 'Threshold', value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'radius', name: 'Radius', value: 30, defaultValue: 30, min: 1, max: 200, step: 1, uniform: 'uRadius' }),
      param({ id: 'intensity', name: 'Intensity', value: 1.0, defaultValue: 1.0, min: 0, max: 10, step: 0.1, uniform: 'uIntensity' }),
      param({ id: 'color', name: 'Tint', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uTint' }),
    ],
  ),
  fragmentShader: undefined as any,
  customRender: (ctx) => {
    const { instance, readTexture, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;
    const threshold = get('threshold') as number ?? 0.4;
    const radius = get('radius') as number ?? 30;
    const intensity = get('intensity') as number ?? 1;
    const tintHex = get('color') as string ?? '#ffffff';

    // Extract bright
    const t1 = acquireScratch(width, height);
    const m1 = getMaterial('extract', EXTRACT, {
      uThreshold: { value: threshold },
      uColor: { value: new (window as any).THREE.Color(tintHex) },
    });
    m1.uniforms.uTexture.value = readTexture;
    renderPass(m1, t1);

    // H blur
    const t2 = acquireScratch(width, height);
    const m2 = getMaterial('blurH', BLUR_H, { uRadius: { value: radius } });
    m2.uniforms.uTexture.value = t1.texture;
    m2.uniforms.uResolution.value.set(width, height);
    renderPass(m2, t2);

    // V blur
    const t3 = acquireScratch(width, height);
    const m3 = getMaterial('blurV', BLUR_V, { uRadius: { value: radius } });
    m3.uniforms.uTexture.value = t2.texture;
    m3.uniforms.uResolution.value.set(width, height);
    renderPass(m3, t3);

    // Composite
    const m4 = getMaterial('comp', COMPOSITE, {
      uGlow: { value: t3.texture },
      uIntensity: { value: intensity },
      uTint: { value: new (window as any).THREE.Color(tintHex) },
    });
    m4.uniforms.uTexture.value = readTexture;
    renderPass(m4, ctx.writeTarget);
  },
};
