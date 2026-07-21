import type { EffectModule } from './types';
import { def, param } from './types';

/**
 * Bloom — cinematic post-process bloom with multiple blur passes.
 * Uses 3 blur passes at different radii for smooth, natural falloff.
 */
const BLUR_H = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uRes; uniform float uR;
varying vec2 vUv;
void main() {
  vec4 c = vec4(0.0); float t = 0.0;
  float s = max(uR / 3.0, 0.001);
  for (int i = -16; i <= 16; i++) {
    float x = float(i);
    float w = exp(-0.5*x*x/(s*s));
    c += texture2D(uTexture, clamp(vUv + vec2(x/uRes.x, 0.0), 0.0, 1.0)) * w;
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
    float y = float(i);
    float w = exp(-0.5*y*y/(s*s));
    c += texture2D(uTexture, clamp(vUv + vec2(0.0, y/uRes.y), 0.0, 1.0)) * w;
    t += w;
  }
  gl_FragColor = c / max(t, 0.001);
}`;

const EXTRACT = `
precision highp float;
uniform sampler2D uTexture; uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(uTexture, vUv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  float m = smoothstep(uThreshold - 0.05, uThreshold + 0.05, lum);
  gl_FragColor = vec4(s.rgb * m, s.a);
}`;

const COMPOSITE = `
precision highp float;
uniform sampler2D uTexture; uniform sampler2D uBloom;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec4 bloom = texture2D(uBloom, vUv);
  gl_FragColor = vec4(src.rgb + bloom.rgb * uIntensity, max(src.a, bloom.a));
}`;

export const bloomEffect: EffectModule = {
  definition: def('bloom', 'Bloom', 'stylize',
    'Cinematic bloom with multi-scale Gaussian blur and smooth falloff.', 6,
    [
      param({ id: 'threshold', name: 'Threshold', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'radius1', name: 'Radius (Tight)', value: 15, defaultValue: 15, min: 1, max: 100, step: 1, uniform: 'uRadius1' }),
      param({ id: 'radius2', name: 'Radius (Medium)', value: 40, defaultValue: 40, min: 1, max: 200, step: 1, uniform: 'uRadius2' }),
      param({ id: 'radius3', name: 'Radius (Wide)', value: 80, defaultValue: 80, min: 1, max: 300, step: 1, uniform: 'uRadius3' }),
      param({ id: 'intensity', name: 'Intensity', value: 1.2, defaultValue: 1.2, min: 0, max: 10, step: 0.1, uniform: 'uIntensity' }),
    ],
  ),
  fragmentShader: undefined as any,
  customRender: (ctx) => {
    const { instance, readTexture, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;
    const threshold = get('threshold') as number ?? 0.3;
    const r1 = get('radius1') as number ?? 15;
    const r2 = get('radius2') as number ?? 40;
    const r3 = get('radius3') as number ?? 80;
    const intensity = get('intensity') as number ?? 1.2;

    // Extract bright areas
    const tExt = acquireScratch(width, height);
    const mExt = getMaterial('extract', EXTRACT, { uThreshold: { value: threshold } });
    mExt.uniforms.uTexture.value = readTexture;
    renderPass(mExt, tExt);

    // Multi-scale: 3 Gaussian blur passes at different radii
    const layers: any[] = [];
    for (const r of [r1, r2, r3]) {
      const t1 = acquireScratch(width, height);
      const mH = getMaterial('bh'+r, BLUR_H, { uR: { value: r } });
      mH.uniforms.uTexture.value = tExt.texture;
      mH.uniforms.uRes.value.set(width, height);
      renderPass(mH, t1);

      const t2 = acquireScratch(width, height);
      const mV = getMaterial('bv'+r, BLUR_V, { uR: { value: r } });
      mV.uniforms.uTexture.value = t1.texture;
      mV.uniforms.uRes.value.set(width, height);
      renderPass(mV, t2);
      layers.push(t2);
    }

    // Composite: sum all bloom layers
    // We'll do a simple multi-pass add: base + layer1 + layer2 + layer3
    let acc = tExt; // Start with extracted bright
    for (const t of layers) {
      const tmp = acquireScratch(width, height);
      const m = getMaterial('add'+t.id, `
        precision highp float;
        uniform sampler2D uA; uniform sampler2D uB;
        varying vec2 vUv;
        void main() {
          vec4 a = texture2D(uA, vUv);
          vec4 b = texture2D(uB, vUv);
          gl_FragColor = vec4(a.rgb + b.rgb, max(a.a, b.a));
        }`, { uA: { value: acc.texture }, uB: { value: t.texture } });
      renderPass(m, tmp);
      acc = tmp;
    }

    // Final composite with source
    const mComp = getMaterial('comp', COMPOSITE, {
      uBloom: { value: acc.texture },
      uIntensity: { value: intensity },
    });
    mComp.uniforms.uTexture.value = readTexture;
    renderPass(mComp, ctx.writeTarget);
  },
};
