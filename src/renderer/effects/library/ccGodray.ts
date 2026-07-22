import * as THREE from 'three';
import type { EffectModule } from './types';
import { def, param } from './types';

const EXTRACT = `
precision highp float;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uSoftKnee;
uniform float uBoost;
uniform float uUseSourceColor;
uniform vec3  uColor;
uniform float uSaturation;
varying vec2 vUv;

void main() {
  vec4 s = texture2D(uTexture, vUv);
  vec3 c = s.rgb * uBoost;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));

  float knee = max(uSoftKnee, 1e-4);
  float soft = clamp(lum - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee);
  float mask = clamp(max(soft, lum - uThreshold), 0.0, 1.0);

  vec3 tint;
  if (uUseSourceColor > 0.5) {
    float avg = (c.r + c.g + c.b) / 3.0;
    tint = mix(vec3(avg), c, uSaturation);
  } else {
    tint = uColor * max(lum, 0.001);
  }
  gl_FragColor = vec4(tint * mask, mask);
}`;

// Small separable blur to smooth extract (kills flickery ray artifacts)
const BLUR = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uTexel;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec4 sum = texture2D(uTexture, vUv) * 0.227027;
  sum += texture2D(uTexture, vUv + uDir * uTexel * 1.3846) * 0.316216;
  sum += texture2D(uTexture, vUv - uDir * uTexel * 1.3846) * 0.316216;
  sum += texture2D(uTexture, vUv + uDir * uTexel * 3.2307) * 0.070270;
  sum += texture2D(uTexture, vUv - uDir * uTexel * 3.2307) * 0.070270;
  gl_FragColor = sum;
}`;

// Radial march — 24 samples per pass. Runs at reduced resolution.
const RADIAL = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uCenter;
uniform float uRayLength;
uniform float uDecay;
uniform float uWeight;
uniform float uNoise;
uniform float uSeed;
varying vec2 vUv;

const int SAMPLES = 24;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

void main() {
  vec2 delta = (vUv - uCenter) * (uRayLength / float(SAMPLES));

  float jitter = (hash(vUv * 1024.0 + uSeed) - 0.5) * uNoise;
  vec2 uv = vUv - delta * jitter;

  vec3 accum = texture2D(uTexture, uv).rgb;
  float illum = 1.0;

  for (int i = 0; i < SAMPLES; i++) {
    uv -= delta;
    vec3 s = texture2D(uTexture, clamp(uv, 0.001, 0.999)).rgb;
    accum += s * illum;
    illum *= uDecay;
  }

  gl_FragColor = vec4(accum * uWeight / float(SAMPLES + 1), 1.0);
}`;

const COMPOSITE = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uGodray;
uniform float uIntensity;
uniform float uMix;
uniform float uExposure;
uniform vec3  uColorMul;
uniform float uUseSourceColor;
uniform float uBlendMode;
uniform vec2  uCenter;
uniform vec2  uResolution;
uniform float uHaloSize;
uniform float uHaloStrength;
uniform float uShowRays;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec3 ray = texture2D(uGodray, vUv).rgb * uExposure;

  vec3 tinted = uUseSourceColor > 0.5 ? ray : ray * uColorMul;
  vec3 glow   = tinted * uIntensity * uMix;

  if (uHaloStrength > 0.001) {
    float aspect = uResolution.x / uResolution.y;
    vec2 d = (vUv - uCenter) * vec2(aspect, 1.0);
    float haloDist = length(d);
    float halo = exp(-haloDist * haloDist / max(uHaloSize * uHaloSize, 1e-4));
    vec3 haloColor = uUseSourceColor > 0.5
      ? texture2D(uGodray, uCenter).rgb * uExposure + vec3(0.3)
      : uColorMul;
    glow += halo * haloColor * uHaloStrength;
  }

  if (uShowRays > 0.5) { gl_FragColor = vec4(glow, 1.0); return; }

  vec3 result;
  if (uBlendMode > 0.5) {
    vec3 a = clamp(src.rgb, 0.0, 1.0);
    vec3 b = clamp(glow,    0.0, 1.0);
    result = 1.0 - (1.0 - a) * (1.0 - b);
    result += max(glow - 1.0, 0.0);
  } else {
    result = src.rgb + glow;
  }
  gl_FragColor = vec4(result, src.a);
}`;

export const ccGodrayEffect: EffectModule = {
  definition: def(
    'ccGodray',
    'CC Godray',
    'generate',
    'Fast cinematic god rays. Runs at 1/4 res for performance.',
    3,
    [
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.3, defaultValue: 0.3, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterY' }),

      param({ id: 'boost',     name: 'Source Boost', value: 1.5, defaultValue: 1.5, min: 0.1, max: 10, step: 0.05, uniform: 'uBoost' }),
      param({ id: 'threshold', name: 'Threshold',    value: 0.4, defaultValue: 0.4, min: 0, max: 2, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'softKnee',  name: 'Soft Knee',    value: 0.5, defaultValue: 0.5, min: 0.01, max: 1, step: 0.01, uniform: 'uSoftKnee' }),

      param({ id: 'useSourceColor', name: 'Use Source Color', type: 'boolean', value: false, defaultValue: false, uniform: 'uUseSourceColor' }),
      param({ id: 'saturation',     name: 'Source Saturation', value: 1.2, defaultValue: 1.2, min: 0, max: 3, step: 0.05, uniform: 'uSaturation' }),
      param({ id: 'color',          name: 'Ray Color', type: 'color', value: '#ffddaa', defaultValue: '#ffddaa', uniform: 'uColor' }),

      param({ id: 'rayLength', name: 'Ray Length', value: 1.0, defaultValue: 1.0, min: 0.05, max: 3, step: 0.02, uniform: 'uRayLength' }),
      param({ id: 'decay',     name: 'Decay',      value: 0.94, defaultValue: 0.94, min: 0.7, max: 0.999, step: 0.001, uniform: 'uDecay' }),
      param({ id: 'weight',    name: 'Ray Weight', value: 1.5, defaultValue: 1.5, min: 0, max: 5, step: 0.05, uniform: 'uWeight' }),
      param({ id: 'exposure',  name: 'Exposure',   value: 2.5, defaultValue: 2.5, min: 0, max: 10, step: 0.05, uniform: 'uExposure' }),
      param({ id: 'noise',     name: 'Dust / Dither', value: 0.3, defaultValue: 0.3, min: 0, max: 2, step: 0.05, uniform: 'uNoise' }),
      param({ id: 'seed',      name: 'Noise Seed', value: 0, defaultValue: 0, min: 0, max: 100, step: 0.1, uniform: 'uSeed' }),

      param({ id: 'quality',   name: 'Quality', type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Draft (1/8 res)',   value: 0 },
          { label: 'Normal (1/4 res)',  value: 1 },
          { label: 'High (1/2 res)',    value: 2 },
          { label: 'Full (1:1)',        value: 3 },
        ], uniform: 'uQuality' }),

      param({ id: 'intensity', name: 'Intensity', value: 1.5, defaultValue: 1.5, min: 0, max: 10, step: 0.05, uniform: 'uIntensity' }),
      param({ id: 'mix',       name: 'Mix',       value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'blendMode', name: 'Blend',     type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Add',    value: 0 },
          { label: 'Screen', value: 1 },
        ], uniform: 'uBlendMode' }),

      param({ id: 'haloSize',     name: 'Halo Size',     value: 0.12, defaultValue: 0.12, min: 0, max: 2, step: 0.01, uniform: 'uHaloSize' }),
      param({ id: 'haloStrength', name: 'Halo Strength', value: 0.4,  defaultValue: 0.4,  min: 0, max: 3, step: 0.05, uniform: 'uHaloStrength' }),

      param({ id: 'showRays', name: 'Show Rays Only', type: 'boolean', value: false, defaultValue: false, uniform: 'uShowRays' }),
    ],
  ),

  fragmentShader: undefined as any,

  customRender: (ctx) => {
    const { instance, readTexture, writeTarget, width, height, getMaterial, acquireScratch, renderPass } = ctx;
    const get = (id: string) => instance.parameters.find(p => p.id === id)?.value;

    const centerX        = (get('centerX')        as number)  ?? 0.5;
    const centerY        = (get('centerY')        as number)  ?? 0.3;
    const boost          = (get('boost')          as number)  ?? 1.5;
    const threshold      = (get('threshold')      as number)  ?? 0.4;
    const softKnee       = (get('softKnee')       as number)  ?? 0.5;
    const useSourceColor = (get('useSourceColor') as boolean) ?? false;
    const saturation     = (get('saturation')     as number)  ?? 1.2;
    const colorHex       = (get('color')          as string)  ?? '#ffddaa';
    const rayLength      = (get('rayLength')      as number)  ?? 1.0;
    const decay          = (get('decay')          as number)  ?? 0.94;
    const weight         = (get('weight')         as number)  ?? 1.5;
    const exposure       = (get('exposure')       as number)  ?? 2.5;
    const noise          = (get('noise')          as number)  ?? 0.3;
    const seed           = (get('seed')           as number)  ?? 0;
    const quality        = (get('quality')        as number)  ?? 1;
    const intensity      = (get('intensity')      as number)  ?? 1.5;
    const mixVal         = (get('mix')            as number)  ?? 1.0;
    const blendMode      = (get('blendMode')      as number)  ?? 1;
    const haloSize       = (get('haloSize')       as number)  ?? 0.12;
    const haloStrength   = (get('haloStrength')   as number)  ?? 0.4;
    const showRays       = (get('showRays')       as boolean) ?? false;

    const color = new THREE.Color(colorHex);
    const useSrc = useSourceColor ? 1 : 0;

    // Resolution divisor from quality dropdown
    const div = [8, 4, 2, 1][Math.round(quality)] ?? 4;
    const lowW = Math.max(64, Math.floor(width  / div));
    const lowH = Math.max(64, Math.floor(height / div));

    // ---- Pass 1: extract emitter at low-res ----
    const t1 = acquireScratch(lowW, lowH);
    const m1 = getMaterial('gr_extract', EXTRACT, {
      uThreshold:      { value: threshold },
      uSoftKnee:       { value: softKnee },
      uBoost:          { value: boost },
      uUseSourceColor: { value: useSrc },
      uColor:          { value: color },
      uSaturation:     { value: saturation },
    });
    m1.uniforms.uTexture.value        = readTexture;
    m1.uniforms.uThreshold.value      = threshold;
    m1.uniforms.uSoftKnee.value       = softKnee;
    m1.uniforms.uBoost.value          = boost;
    m1.uniforms.uUseSourceColor.value = useSrc;
    (m1.uniforms.uColor.value as THREE.Color).set(colorHex);
    m1.uniforms.uSaturation.value     = saturation;
    renderPass(m1, t1);

    // ---- Pass 2 & 3: separable blur on extract (smoothing) ----
    const t1b = acquireScratch(lowW, lowH);
    const mbH = getMaterial('gr_blurH', BLUR, {
      uTexel: { value: new THREE.Vector2(1 / lowW, 1 / lowH) },
      uDir:   { value: new THREE.Vector2(1, 0) },
    });
    mbH.uniforms.uTexture.value = t1.texture;
    (mbH.uniforms.uTexel.value as THREE.Vector2).set(1 / lowW, 1 / lowH);
    (mbH.uniforms.uDir.value as THREE.Vector2).set(1, 0);
    renderPass(mbH, t1b);

    const t1c = acquireScratch(lowW, lowH);
    const mbV = getMaterial('gr_blurV', BLUR, {
      uTexel: { value: new THREE.Vector2(1 / lowW, 1 / lowH) },
      uDir:   { value: new THREE.Vector2(0, 1) },
    });
    mbV.uniforms.uTexture.value = t1b.texture;
    (mbV.uniforms.uTexel.value as THREE.Vector2).set(1 / lowW, 1 / lowH);
    (mbV.uniforms.uDir.value as THREE.Vector2).set(0, 1);
    renderPass(mbV, t1c);

    // ---- Pass 4: radial march (24 samples, low-res) ----
    const t2 = acquireScratch(lowW, lowH);
    const m2 = getMaterial('gr_radial1', RADIAL, {
      uCenter:    { value: new THREE.Vector2(centerX, centerY) },
      uRayLength: { value: rayLength },
      uDecay:     { value: decay },
      uWeight:    { value: weight },
      uNoise:     { value: noise },
      uSeed:      { value: seed },
    });
    m2.uniforms.uTexture.value = t1c.texture;
    (m2.uniforms.uCenter.value as THREE.Vector2).set(centerX, centerY);
    m2.uniforms.uRayLength.value = rayLength;
    m2.uniforms.uDecay.value     = decay;
    m2.uniforms.uWeight.value    = weight;
    m2.uniforms.uNoise.value     = noise;
    m2.uniforms.uSeed.value      = seed;
    renderPass(m2, t2);

    // ---- Pass 5: second radial march (uses first result — smooth streaks) ----
    const t3 = acquireScratch(lowW, lowH);
    const m3 = getMaterial('gr_radial2', RADIAL, {
      uCenter:    { value: new THREE.Vector2(centerX, centerY) },
      uRayLength: { value: rayLength * 0.5 },
      uDecay:     { value: decay },
      uWeight:    { value: 1.0 },
      uNoise:     { value: noise * 0.5 },
      uSeed:      { value: seed + 1.7 },
    });
    m3.uniforms.uTexture.value = t2.texture;
    (m3.uniforms.uCenter.value as THREE.Vector2).set(centerX, centerY);
    m3.uniforms.uRayLength.value = rayLength * 0.5;
    m3.uniforms.uDecay.value     = decay;
    m3.uniforms.uWeight.value    = 1.0;
    m3.uniforms.uNoise.value     = noise * 0.5;
    m3.uniforms.uSeed.value      = seed + 1.7;
    renderPass(m3, t3);

    // ---- Pass 6: composite back at full res ----
    const mc = getMaterial('gr_comp', COMPOSITE, {
      uGodray:         { value: t3.texture },
      uIntensity:      { value: intensity },
      uMix:            { value: mixVal },
      uExposure:       { value: exposure },
      uColorMul:       { value: color },
      uUseSourceColor: { value: useSrc },
      uBlendMode:      { value: blendMode },
      uCenter:         { value: new THREE.Vector2(centerX, centerY) },
      uResolution:     { value: new THREE.Vector2(width, height) },
      uHaloSize:       { value: haloSize },
      uHaloStrength:   { value: haloStrength },
      uShowRays:       { value: showRays ? 1 : 0 },
    });
    mc.uniforms.uTexture.value        = readTexture;
    mc.uniforms.uGodray.value         = t3.texture;
    mc.uniforms.uIntensity.value      = intensity;
    mc.uniforms.uMix.value            = mixVal;
    mc.uniforms.uExposure.value       = exposure;
    (mc.uniforms.uColorMul.value as THREE.Color).set(colorHex);
    mc.uniforms.uUseSourceColor.value = useSrc;
    mc.uniforms.uBlendMode.value      = blendMode;
    (mc.uniforms.uCenter.value as THREE.Vector2).set(centerX, centerY);
    (mc.uniforms.uResolution.value as THREE.Vector2).set(width, height);
    mc.uniforms.uHaloSize.value       = haloSize;
    mc.uniforms.uHaloStrength.value   = haloStrength;
    mc.uniforms.uShowRays.value       = showRays ? 1 : 0;
    renderPass(mc, writeTarget);
  },
};