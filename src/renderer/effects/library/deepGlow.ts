import type { EffectModule } from './types';
import { def, param } from './types';
import * as THREE from 'three';
import type { EffectRenderContext } from './types';

const EXTRACT_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uSoftKnee;
uniform float uExposure;
uniform float uUnmult;
uniform float uPreGain;      // boost bright pass so 8-bit targets don't crush
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec3 c = src.rgb;

  if (uUnmult > 0.5 && src.a > 0.001) c /= src.a;
  c *= pow(2.0, uExposure);

  float br = max(c.r, max(c.g, c.b));
  float knee = uThreshold * uSoftKnee + 1e-5;
  float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-5);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-5);

  vec3 outC = c * contrib * uPreGain;
  // clamp so 8-bit targets don't lose it entirely - but keep hdr headroom
  outC = min(outC, vec3(4.0));
  gl_FragColor = vec4(outC, 1.0);
}
`;

const DOWNSAMPLE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec4 A=texture2D(uTexture,vUv+uTexel*vec2(-1.,-1.));
  vec4 B=texture2D(uTexture,vUv+uTexel*vec2( 0.,-1.));
  vec4 C=texture2D(uTexture,vUv+uTexel*vec2( 1.,-1.));
  vec4 D=texture2D(uTexture,vUv+uTexel*vec2(-.5,-.5));
  vec4 E=texture2D(uTexture,vUv+uTexel*vec2( .5,-.5));
  vec4 F=texture2D(uTexture,vUv+uTexel*vec2(-1., 0.));
  vec4 G=texture2D(uTexture,vUv);
  vec4 H=texture2D(uTexture,vUv+uTexel*vec2( 1., 0.));
  vec4 I=texture2D(uTexture,vUv+uTexel*vec2(-.5, .5));
  vec4 J=texture2D(uTexture,vUv+uTexel*vec2( .5, .5));
  vec4 K=texture2D(uTexture,vUv+uTexel*vec2(-1., 1.));
  vec4 L=texture2D(uTexture,vUv+uTexel*vec2( 0., 1.));
  vec4 M=texture2D(uTexture,vUv+uTexel*vec2( 1., 1.));
  vec4 s=(D+E+I+J)*0.5;
  s+=(A+B+G+F)*0.125;
  s+=(B+C+H+G)*0.125;
  s+=(F+G+L+K)*0.125;
  s+=(G+H+M+L)*0.125;
  gl_FragColor = s * 0.25;
}
`;

const UPSAMPLE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uScatter;
varying vec2 vUv;
void main() {
  vec4 s;
  s  = texture2D(uTexture, vUv+uTexel*vec2(-1.,-1.)) * 1.;
  s += texture2D(uTexture, vUv+uTexel*vec2( 0.,-1.)) * 2.;
  s += texture2D(uTexture, vUv+uTexel*vec2( 1.,-1.)) * 1.;
  s += texture2D(uTexture, vUv+uTexel*vec2(-1., 0.)) * 2.;
  s += texture2D(uTexture, vUv                     ) * 4.;
  s += texture2D(uTexture, vUv+uTexel*vec2( 1., 0.)) * 2.;
  s += texture2D(uTexture, vUv+uTexel*vec2(-1., 1.)) * 1.;
  s += texture2D(uTexture, vUv+uTexel*vec2( 0., 1.)) * 2.;
  s += texture2D(uTexture, vUv+uTexel*vec2( 1., 1.)) * 1.;
  s *= (1.0 / 16.0);
  vec4 prev = texture2D(uPrev, vUv);
  gl_FragColor = prev + s * uScatter;   // simple additive, cleaner than mix
}
`;

const COMPOSITE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uGlow;
uniform float uIntensity;
uniform float uPreGain;      // must match extract, we divide it back out
uniform vec3  uTint;
uniform float uChromaticAb;
uniform float uToneMap;
uniform float uGlowOnly;
uniform float uBlendMode;    // 0 add, 1 screen
varying vec2 vUv;

vec3 filmic(vec3 x){float A=0.15,B=0.5,C=0.1,D=0.2,E=0.02,F=0.3;return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;}
vec3 reinhard(vec3 x){return x/(1.0+x);}
vec3 aces(vec3 x){const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}

void main() {
  vec4 src = texture2D(uTexture, vUv);

  vec3 glow;
  if (uChromaticAb > 0.0001) {
    float ca = uChromaticAb * 0.006;
    vec2 dir = normalize(vUv - 0.5 + 1e-6);
    float r = texture2D(uGlow, vUv + dir *  ca).r;
    float g = texture2D(uGlow, vUv               ).g;
    float b = texture2D(uGlow, vUv - dir *  ca).b;
    glow = vec3(r, g, b);
  } else {
    glow = texture2D(uGlow, vUv).rgb;
  }

  // Undo the pre-gain we applied in extract, then apply user intensity
  glow /= max(uPreGain, 1e-4);
  glow *= uTint * uIntensity;

  vec3 result;
  if (uGlowOnly > 0.5) {
    result = glow;
  } else if (uBlendMode > 0.5) {
    // Screen blend - preserves bright pixels' saturation but adds glow bloom
    vec3 s = clamp(src.rgb, 0.0, 1.0);
    vec3 g = clamp(glow,    0.0, 4.0);
    result = 1.0 - (1.0 - s) * (1.0 - g);
    // Then still add remaining energy above 1 (super bright)
    result += max(glow - 1.0, 0.0);
  } else {
    result = src.rgb + glow;
  }

  if (uToneMap > 2.5)      result = aces(result);
  else if (uToneMap > 1.5) result = reinhard(result);
  else if (uToneMap > 0.5) result = filmic(result) / filmic(vec3(11.2));

  gl_FragColor = vec4(result, src.a);
}
`;

const MIP_LEVELS = 7;
const PRE_GAIN = 2.0; // internal boost to survive 8-bit targets

export const deepGlowEffect: EffectModule = {
  definition: def(
    'deepGlow',
    'Deep Glow',
    'stylize',
    'AE-style multi-scale bloom. Fast, HDR-safe, works on any color.',
    4,
    [
      param({ id: 'threshold',   name: 'Threshold',    value: 0.4,  defaultValue: 0.4,  min: 0,   max: 2,   step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'softKnee',    name: 'Soft Knee',    value: 0.7,  defaultValue: 0.7,  min: 0,   max: 1,   step: 0.01, uniform: 'uSoftKnee' }),
      param({ id: 'radius',      name: 'Radius',       value: 1.0,  defaultValue: 1.0,  min: 0,   max: 2,   step: 0.01, uniform: 'uScatter' }),
      param({ id: 'intensity',   name: 'Intensity',    value: 2.0,  defaultValue: 2.0,  min: 0,   max: 20,  step: 0.05, uniform: 'uIntensity' }),
      param({ id: 'exposure',    name: 'Exposure',     value: 0,    defaultValue: 0,    min: -4,  max: 4,   step: 0.1,  uniform: 'uExposure' }),
      param({ id: 'tint',        name: 'Tint',         type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uTint' }),
      param({ id: 'chromaticAb', name: 'Chromatic Ab', value: 0,    defaultValue: 0,    min: 0,   max: 5,   step: 0.05, uniform: 'uChromaticAb' }),
      param({ id: 'blendMode',   name: 'Blend',        type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Add',    value: 0 },
          { label: 'Screen', value: 1 },
        ], uniform: 'uBlendMode' }),
      param({ id: 'toneMap',     name: 'Tone Map',     type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'None',     value: 0 },
          { label: 'Filmic',   value: 1 },
          { label: 'Reinhard', value: 2 },
          { label: 'ACES',     value: 3 },
        ], uniform: 'uToneMap' }),
      param({ id: 'unmult',      name: 'Unmult',       type: 'boolean', value: false, defaultValue: false, uniform: 'uUnmult' }),
      param({ id: 'glowOnly',    name: 'Glow Only',    type: 'boolean', value: false, defaultValue: false, uniform: 'uGlowOnly' }),
    ],
  ),

  fragmentShader: undefined as any,

  customRender(ctx: EffectRenderContext): void {
    const {
      instance, readTexture, writeTarget, width, height,
      getMaterial, acquireScratch, renderPass,
    } = ctx;

    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;

    const threshold   = (get('threshold')   as number) ?? 0.4;
    const softKnee    = (get('softKnee')    as number) ?? 0.7;
    const scatter     = (get('radius')      as number) ?? 1.0;
    const intensity   = (get('intensity')   as number) ?? 2.0;
    const exposure    = (get('exposure')    as number) ?? 0;
    const tintHex     = (get('tint')        as string) ?? '#ffffff';
    const chromaticAb = (get('chromaticAb') as number) ?? 0;
    const blendMode   = (get('blendMode')   as number) ?? 1;
    const toneMap     = (get('toneMap')     as number) ?? 0;
    const unmult      = (get('unmult')      as boolean) ?? false;
    const glowOnly    = (get('glowOnly')    as boolean) ?? false;

    // ---- Extract bright pass ----
    const bright = acquireScratch(width, height);
    const extractMat = getMaterial('dg_extract', EXTRACT_FRAG, {
      uThreshold: { value: threshold },
      uSoftKnee:  { value: softKnee },
      uExposure:  { value: exposure },
      uUnmult:    { value: unmult ? 1 : 0 },
      uPreGain:   { value: PRE_GAIN },
    });
    extractMat.uniforms.uTexture.value   = readTexture;
    extractMat.uniforms.uThreshold.value = threshold;
    extractMat.uniforms.uSoftKnee.value  = softKnee;
    extractMat.uniforms.uExposure.value  = exposure;
    extractMat.uniforms.uUnmult.value    = unmult ? 1 : 0;
    extractMat.uniforms.uPreGain.value   = PRE_GAIN;
    renderPass(extractMat, bright);

    // ---- Downsample pyramid ----
    const mips: THREE.WebGLRenderTarget[] = [bright];
    let w = width, h = height;
    for (let i = 0; i < MIP_LEVELS; i++) {
      const nw = Math.max(2, w >> 1);
      const nh = Math.max(2, h >> 1);
      if (nw < 4 || nh < 4) break;
      const target = acquireScratch(nw, nh);
      const mat = getMaterial(`dg_down_${i}`, DOWNSAMPLE_FRAG, {
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      });
      mat.uniforms.uTexture.value = mips[mips.length - 1].texture;
      (mat.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
      renderPass(mat, target);
      mips.push(target);
      w = nw; h = nh;
    }

    // ---- Upsample & accumulate ----
    let current = mips[mips.length - 1];
    for (let i = mips.length - 2; i >= 0; i--) {
      const higher = mips[i];
      const combined = acquireScratch(higher.width, higher.height);
      const mat = getMaterial(`dg_up_${i}`, UPSAMPLE_FRAG, {
        uPrev:    { value: higher.texture },
        uTexel:   { value: new THREE.Vector2(1 / current.width, 1 / current.height) },
        uScatter: { value: scatter },
      });
      mat.uniforms.uTexture.value = current.texture;
      mat.uniforms.uPrev.value    = higher.texture;
      (mat.uniforms.uTexel.value as THREE.Vector2).set(1 / current.width, 1 / current.height);
      mat.uniforms.uScatter.value = scatter;
      renderPass(mat, combined);
      current = combined;
    }

    // ---- Composite ----
    const tintColor = new THREE.Color(tintHex);
    const compMat = getMaterial('dg_composite', COMPOSITE_FRAG, {
      uGlow:        { value: current.texture },
      uIntensity:   { value: intensity },
      uPreGain:     { value: PRE_GAIN },
      uTint:        { value: tintColor },
      uChromaticAb: { value: chromaticAb },
      uToneMap:     { value: toneMap },
      uGlowOnly:    { value: glowOnly ? 1 : 0 },
      uBlendMode:   { value: blendMode },
    });
    compMat.uniforms.uTexture.value     = readTexture;
    compMat.uniforms.uGlow.value        = current.texture;
    compMat.uniforms.uIntensity.value   = intensity;
    compMat.uniforms.uPreGain.value     = PRE_GAIN;
    (compMat.uniforms.uTint.value as THREE.Color).set(tintHex);
    compMat.uniforms.uChromaticAb.value = chromaticAb;
    compMat.uniforms.uToneMap.value     = toneMap;
    compMat.uniforms.uGlowOnly.value    = glowOnly ? 1 : 0;
    compMat.uniforms.uBlendMode.value   = blendMode;
    renderPass(compMat, writeTarget);
  },
};