import type { EffectModule } from './types';
import { def, param } from './types';

const WAVES_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uCenterX;
uniform float uCenterY;
uniform float uAutoAnimate;   // 0 = manual, 1 = use uTime
uniform float uSpeed;
uniform float uProgress;      // manual time driver (unbounded)
uniform float uTime;          // host clock
uniform float uFrequency;     // rings per unit distance
uniform float uWaveWidth;     // sharpness of each ring (0 fat, 1 thin)
uniform float uAmplitude;
uniform float uFalloff;       // how quickly rings fade with distance (0 none, 4+ tight)
uniform float uMaxRadius;     // limit how far rings travel (1 = full, 0.1 = tight)
uniform float uRingCount;     // how many visible rings in the tail
uniform vec3  uColor;
uniform float uAspectCorrect; // 0 = uv space (ovals on wide), 1 = pixel-round
uniform float uBlendMode;     // 0 = add, 1 = screen, 2 = replace
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);

  vec2 center = vec2(uCenterX, uCenterY);
  vec2 delta  = vUv - center;

  // Aspect-correct so rings are circular on any canvas
  if (uAspectCorrect > 0.5) {
    delta.x *= uResolution.x / uResolution.y;
  }

  float dist = length(delta);

  // Time source
  float t = mix(uProgress, uTime * uSpeed, step(0.5, uAutoAnimate));

  // Wave phase: rings expand outward as t grows
  float phase = dist * uFrequency - t;

  // Fractional part of phase, wrapped, gives ring shape
  float ring  = fract(phase);
  // Each ring: a smooth pulse peaking at ring==0
  //  - triangular/gaussian falloff based on uWaveWidth
  float width = mix(0.5, 0.02, clamp(uWaveWidth, 0.0, 1.0));
  float pulse = exp(-pow(ring / width, 2.0));
  // Also account for wrap on the other side of the peak
  float pulse2 = exp(-pow((ring - 1.0) / width, 2.0));
  pulse = max(pulse, pulse2);

  // Only show a limited number of rings behind the leading edge
  //  - leading edge is where phase == 0 (dist == t/frequency)
  //  - hide rings ahead of the leading edge and beyond ring count
  float leadDist  = t / max(uFrequency, 0.001);
  float ringIndex = (leadDist - dist) * uFrequency; // 0 at edge, grows inward
  float trailMask = smoothstep(uRingCount, uRingCount - 1.0, ringIndex) *
                    step(0.0, ringIndex);

  // Distance fade
  float distFade = exp(-dist * uFalloff);

  // Max radius cutoff (soft)
  float radiusMask = 1.0 - smoothstep(uMaxRadius - 0.05, uMaxRadius, dist);

  float ringVal = pulse * trailMask * distFade * radiusMask * uAmplitude;

  vec3 ringCol = uColor * ringVal;

  vec3 result;
  if (uBlendMode > 1.5) {
    // replace (show only rings)
    result = ringCol;
  } else if (uBlendMode > 0.5) {
    // screen
    vec3 a = clamp(src.rgb, 0.0, 1.0);
    vec3 b = clamp(ringCol, 0.0, 4.0);
    result = 1.0 - (1.0 - a) * (1.0 - min(b, vec3(1.0)));
    result += max(b - 1.0, 0.0);
  } else {
    // additive
    result = src.rgb + ringCol;
  }

  float outA = (uBlendMode > 1.5)
    ? clamp(ringVal, 0.0, 1.0)
    : max(src.a, clamp(ringVal, 0.0, 1.0));

  gl_FragColor = vec4(result, outA);
}`;

export const radioWavesEffect: EffectModule = {
  definition: def(
    'radioWaves',
    'Radio Waves',
    'generate',
    'Sonar / radar / ripple rings expanding from a point. Auto or manual timing.',
    1,
    [
      param({ id: 'posX',         name: 'Center X',        value: 0.5,  defaultValue: 0.5,  min: 0,   max: 1,   step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'posY',         name: 'Center Y',        value: 0.5,  defaultValue: 0.5,  min: 0,   max: 1,   step: 0.001, uniform: 'uCenterY' }),

      param({ id: 'autoAnimate',  name: 'Auto Animate',    type: 'boolean', value: true, defaultValue: true, uniform: 'uAutoAnimate' }),
      param({ id: 'speed',        name: 'Speed',           value: 1.0,  defaultValue: 1.0,  min: 0,   max: 20,  step: 0.05, uniform: 'uSpeed' }),
      param({ id: 'progress',     name: 'Progress (manual)', value: 0,  defaultValue: 0,    min: -1000, max: 1000, step: 0.01, uniform: 'uProgress' }),

      param({ id: 'frequency',    name: 'Ring Density',    value: 4.0,  defaultValue: 4.0,  min: 0.5, max: 40,  step: 0.1, uniform: 'uFrequency' }),
      param({ id: 'waveWidth',    name: 'Ring Sharpness',  value: 0.7,  defaultValue: 0.7,  min: 0,   max: 1,   step: 0.01, uniform: 'uWaveWidth' }),
      param({ id: 'ringCount',    name: 'Ring Count',      value: 5,    defaultValue: 5,    min: 1,   max: 30,  step: 1,   uniform: 'uRingCount' }),
      param({ id: 'amplitude',    name: 'Amplitude',       value: 1.0,  defaultValue: 1.0,  min: 0,   max: 5,   step: 0.05, uniform: 'uAmplitude' }),
      param({ id: 'falloff',      name: 'Distance Falloff', value: 1.5, defaultValue: 1.5,  min: 0,   max: 10,  step: 0.1, uniform: 'uFalloff' }),
      param({ id: 'maxRadius',    name: 'Max Radius',      value: 1.0,  defaultValue: 1.0,  min: 0.05, max: 2,  step: 0.01, uniform: 'uMaxRadius' }),

      param({ id: 'color',        name: 'Colour',          type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),

      param({ id: 'aspectCorrect', name: 'Circular Rings', type: 'boolean', value: true, defaultValue: true, uniform: 'uAspectCorrect' }),

      param({ id: 'blendMode',    name: 'Blend',           type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Add',     value: 0 },
          { label: 'Screen',  value: 1 },
          { label: 'Replace', value: 2 },
        ], uniform: 'uBlendMode' }),
    ],
  ),
  fragmentShader: WAVES_FRAG,
  usesTime: true,
};