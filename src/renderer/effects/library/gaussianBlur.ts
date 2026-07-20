import * as THREE from 'three';
import type { EffectModule, EffectRenderContext } from './types';
import { def, param, DEFAULT_VERTEX_SHADER } from './types';

const FS_H = `uniform sampler2D uTexture; uniform float uRadius; uniform vec2 uResolution;
varying vec2 vUv;
void main() {
  float sigma = max(uRadius, 0.5);
  float texelX = 1.0 / uResolution.x;
  vec4 col = vec4(0.0);
  float total = 0.0;
  for (int i = -6; i <= 6; i++) {
    float fi = float(i);
    float w = exp(-(fi * fi) / (2.0 * sigma * sigma));
    vec2 off = vec2(fi * texelX * (sigma / 3.0), 0.0);
    col += texture2D(uTexture, vUv + off) * w;
    total += w;
  }
  gl_FragColor = col / total;
}`;

const FS_V = `uniform sampler2D uTexture; uniform float uRadius; uniform vec2 uResolution;
varying vec2 vUv;
void main() {
  float sigma = max(uRadius, 0.5);
  float texelY = 1.0 / uResolution.y;
  vec4 col = vec4(0.0);
  float total = 0.0;
  for (int i = -6; i <= 6; i++) {
    float fi = float(i);
    float w = exp(-(fi * fi) / (2.0 * sigma * sigma));
    vec2 off = vec2(0.0, fi * texelY * (sigma / 3.0));
    col += texture2D(uTexture, vUv + off) * w;
    total += w;
  }
  gl_FragColor = col / total;
}`;

export const gaussianBlurEffect: EffectModule = {
  definition: def(
    'gaussianBlur',
    'Gaussian Blur',
    'blur',
    'Smooth two-pass separable gaussian blur.',
    2,
    [
      param({ id: 'radius', name: 'Radius', value: 10, defaultValue: 10, min: 0, max: 200, step: 0.5, uniform: 'uRadius' }),
      param({
        id: 'quality', name: 'Quality', type: 'select',
        value: 'medium', defaultValue: 'medium',
        options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }],
        uniform: 'uQuality',
      }),
    ],
  ),
  vertexShader: DEFAULT_VERTEX_SHADER,
  customRender: (ctx: EffectRenderContext) => {
    const scratch = ctx.acquireScratch(ctx.width, ctx.height);
    const uniformsBase: Record<string, THREE.IUniform> = {
      uTexture: { value: null },
      uResolution: { value: new THREE.Vector2(ctx.width, ctx.height) },
      uRadius: { value: 10 },
    };
    const matH = ctx.getMaterial('blur_h', FS_H, uniformsBase);
    const matV = ctx.getMaterial('blur_v', FS_V, uniformsBase);

    // Sync radius from instance params
    const radius = Number(ctx.instance.parameters.find(p => p.id === 'radius')?.value ?? 10);
    (matH.uniforms as any).uRadius.value = radius;
    (matV.uniforms as any).uRadius.value = radius;
    (matH.uniforms as any).uResolution.value.set(ctx.width, ctx.height);
    (matV.uniforms as any).uResolution.value.set(ctx.width, ctx.height);

    // Horizontal pass: readTexture → scratch
    (matH.uniforms as any).uTexture.value = ctx.readTexture;
    ctx.renderPass(matH, scratch);

    // Vertical pass: scratch → writeTarget
    (matV.uniforms as any).uTexture.value = scratch.texture;
    ctx.renderPass(matV, ctx.writeTarget);
  },
};