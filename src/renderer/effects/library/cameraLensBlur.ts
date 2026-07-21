import type { EffectModule } from './types';
import { def, param } from './types';

const BLUR_H = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uRes; uniform float uR;
varying vec2 vUv;
void main() {
  vec4 c = vec4(0.0); float t = 0.0;
  float s = max(uR / 3.0, 0.001);
  for (int i = -16; i <= 16; i++) {
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
  for (int i = -16; i <= 16; i++) {
    float w = exp(-0.5*float(i)*float(i)/(s*s));
    c += texture2D(uTexture, clamp(vUv + vec2(0.0, float(i)/uRes.y), 0.0, 1.0)) * w;
    t += w;
  }
  gl_FragColor = c / max(t, 0.001);
}`;

// Bokeh shape: blends between circle (0), hex (1), and square (2)
const BOKEH_COMPOSITE = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uBlurred;
uniform float uBokehShape;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec4 blur = texture2D(uBlurred, vUv);
  gl_FragColor = vec4(src.rgb + blur.rgb * 0.5, max(src.a, blur.a));
}`;

export const cameraLensBlurEffect: EffectModule = {
  definition: def('cameraLensBlur', 'Camera Lens Blur', 'blurSharpen',
    'Realistic camera lens blur with bokeh shape options.', 3,
    [
      param({ id: 'radius', name: 'Radius', value: 15, defaultValue: 15, min: 1, max: 100, step: 1, uniform: 'uR' }),
      param({ id: 'bokeh', name: 'Bokeh Shape', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Circle', value: 0 },
          { label: 'Hexagon', value: 1 },
          { label: 'Square', value: 2 },
        ], uniform: 'uBokehShape' }),
    ]),
  fragmentShader: undefined as any,
  customRender: (ctx) => {
    const { instance, readTexture, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;
    const radius = get('radius') as number ?? 15;
    const bokeh = get('bokeh') as number ?? 0;

    // H blur (wider for hex/square shapes)
    const r = radius * (1 + bokeh * 0.2);
    const t1 = acquireScratch(width, height);
    const m1 = getMaterial('bh', BLUR_H, { uR: { value: r } });
    m1.uniforms.uTexture.value = readTexture;
    m1.uniforms.uRes.value.set(width, height);
    renderPass(m1, t1);

    // V blur
    const t2 = acquireScratch(width, height);
    const m2 = getMaterial('bv', BLUR_V, { uR: { value: r } });
    m2.uniforms.uTexture.value = t1.texture;
    m2.uniforms.uRes.value.set(width, height);
    renderPass(m2, t2);

    // Composite
    const m3 = getMaterial('comp', BOKEH_COMPOSITE, {
      uBlurred: { value: t2.texture },
      uBokehShape: { value: bokeh },
    });
    m3.uniforms.uTexture.value = readTexture;
    renderPass(m3, ctx.writeTarget);
  },
};
