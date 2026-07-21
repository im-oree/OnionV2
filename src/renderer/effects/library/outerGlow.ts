import type { EffectModule } from './types';
import { def, param } from './types';

const BLUR_H = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uResolution; uniform float uRadius;
varying vec2 vUv;
void main() {
  vec4 c = vec4(0.0); float t = 0.0;
  float s = max(uRadius / 3.0, 0.001);
  for (int i = -16; i <= 16; i++) {
    float x = float(i);
    float w = exp(-0.5 * x * x / (s * s));
    vec2 uv = clamp(vUv + vec2(x / uResolution.x, 0.0), 0.0, 1.0);
    c += texture2D(uTexture, uv) * w; t += w;
  }
  gl_FragColor = c / max(t, 0.001);
}`;

const BLUR_V = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uResolution; uniform float uRadius;
varying vec2 vUv;
void main() {
  vec4 c = vec4(0.0); float t = 0.0;
  float s = max(uRadius / 3.0, 0.001);
  for (int i = -16; i <= 16; i++) {
    float y = float(i);
    float w = exp(-0.5 * y * y / (s * s));
    vec2 uv = clamp(vUv + vec2(0.0, y / uResolution.y), 0.0, 1.0);
    c += texture2D(uTexture, uv) * w; t += w;
  }
  gl_FragColor = c / max(t, 0.001);
}`;

const COMPOSITE = `
precision highp float;
uniform sampler2D uTexture; uniform sampler2D uGlow;
uniform vec3 uColor; uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec4 glow = texture2D(uGlow, vUv);
  vec3 result = src.rgb + uColor * glow.a * uIntensity;
  gl_FragColor = vec4(result, max(src.a, glow.a));
}`;

export const outerGlowEffect: EffectModule = {
  definition: def('outerGlow', 'Outer Glow', 'stylize',
    'Soft halo around alpha edges using Gaussian blur.', 3, [
    param({ id: 'color', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),
    param({ id: 'radius', name: 'Radius', value: 20, defaultValue: 20, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
    param({ id: 'intensity', name: 'Intensity', value: 1.5, defaultValue: 1.5, min: 0, max: 5, step: 0.1, uniform: 'uIntensity' }),
    param({ id: 'spread', name: 'Spread', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uSpread' }),
  ]),
  fragmentShader: undefined as any,
  customRender: (ctx) => {
    const { instance, readTexture, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;
    const radius = get('radius') as number ?? 20;
    const intensity = get('intensity') as number ?? 1.5;
    const tintHex = get('color') as string ?? '#ffffff';

    // H blur
    const t1 = acquireScratch(width, height);
    const m1 = getMaterial('blurH', BLUR_H, { uRadius: { value: radius } });
    m1.uniforms.uTexture.value = readTexture;
    m1.uniforms.uResolution.value.set(width, height);
    renderPass(m1, t1);

    // V blur
    const t2 = acquireScratch(width, height);
    const m2 = getMaterial('blurV', BLUR_V, { uRadius: { value: radius } });
    m2.uniforms.uTexture.value = t1.texture;
    m2.uniforms.uResolution.value.set(width, height);
    renderPass(m2, t2);

    // Composite
    const m3 = getMaterial('comp', COMPOSITE, {
      uGlow: { value: t2.texture },
      uColor: { value: new (window as any).THREE.Color(tintHex) },
      uIntensity: { value: intensity },
    });
    m3.uniforms.uTexture.value = readTexture;
    renderPass(m3, ctx.writeTarget);
  },
};
