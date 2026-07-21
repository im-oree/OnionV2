import type { EffectModule } from './types';
import { def, param } from './types';

const BLUR_H = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uRes; uniform float uR;
varying vec2 vUv;
void main() {
  vec4 c = vec4(0.0); float t = 0.0;
  float s = max(uR / 3.0, 0.001);
  for (int i = -8; i <= 8; i++) {
    float w = exp(-0.5*float(i)*float(i)/(s*s));
    c += texture2D(uTexture, clamp(vUv + vec2(float(i)/uRes.x, 0.0), 0.0, 1.0)) * w;
    t += w;
  }
  gl_FragColor = c / max(t, 0.001);
}`;

const BLUR_V = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uRes; uniform float uR;
varying vec2 vUv;
void main() {
  vec4 c = vec4(0.0); float t = 0.0;
  float s = max(uR / 3.0, 0.001);
  for (int i = -8; i <= 8; i++) {
    float w = exp(-0.5*float(i)*float(i)/(s*s));
    c += texture2D(uTexture, clamp(vUv + vec2(0.0, float(i)/uRes.y), 0.0, 1.0)) * w;
    t += w;
  }
  gl_FragColor = c / max(t, 0.001);
}`;

const UNSHARP = `
precision highp float;
uniform sampler2D uTexture; uniform sampler2D uBlurred;
uniform float uAmount; uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec4 orig = texture2D(uTexture, vUv);
  vec4 blur = texture2D(uBlurred, vUv);
  float diff = length(orig.rgb - blur.rgb);
  float mask = step(uThreshold, diff);
  vec3 sharpened = orig.rgb + (orig.rgb - blur.rgb) * uAmount * mask;
  gl_FragColor = vec4(clamp(sharpened, 0.0, 1.0), orig.a);
}`;

export const unsharpMaskEffect: EffectModule = {
  definition: def('unsharpMask', 'Unsharp Mask', 'blurSharpen',
    'Professional sharpening via blurred subtraction.', 3,
    [
      param({ id: 'radius', name: 'Radius', value: 3, defaultValue: 3, min: 1, max: 20, step: 0.5, uniform: 'uR' }),
      param({ id: 'amount', name: 'Amount', value: 1.5, defaultValue: 1.5, min: 0, max: 5, step: 0.1, uniform: 'uAmount' }),
      param({ id: 'threshold', name: 'Threshold', value: 0.05, defaultValue: 0.05, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
    ]),
  fragmentShader: undefined as any,
  customRender: (ctx) => {
    const { instance, readTexture, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;
    const radius = get('radius') as number ?? 3;
    const amount = get('amount') as number ?? 1.5;
    const threshold = get('threshold') as number ?? 0.05;

    // H blur
    const t1 = acquireScratch(width, height);
    const m1 = getMaterial('bh', BLUR_H, { uR: { value: radius } });
    m1.uniforms.uTexture.value = readTexture;
    m1.uniforms.uRes.value.set(width, height);
    renderPass(m1, t1);

    // V blur
    const t2 = acquireScratch(width, height);
    const m2 = getMaterial('bv', BLUR_V, { uR: { value: radius } });
    m2.uniforms.uTexture.value = t1.texture;
    m2.uniforms.uRes.value.set(width, height);
    renderPass(m2, t2);

    // Unsharp
    const m3 = getMaterial('usm', UNSHARP, {
      uBlurred: { value: t2.texture },
      uAmount: { value: amount },
      uThreshold: { value: threshold },
    });
    m3.uniforms.uTexture.value = readTexture;
    renderPass(m3, ctx.writeTarget);
  },
};
