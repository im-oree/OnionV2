import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uAmount;
uniform float uScatterX;
uniform float uScatterY;
uniform float uGrainSize;
uniform float uMode;
uniform float uAngle;
uniform float uCenterX;
uniform float uCenterY;
uniform float uBias;
uniform float uEdgePreserve;
uniform float uSeed;
uniform float uTime;
uniform float uAnimate;
varying vec2 vUv;

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec2 hash2(vec2 p) {
  return fract(sin(vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )) * 43758.5453) - 0.5;
}

float localLuma(vec2 uv) {
  vec3 c = texture2D(uTexture, uv).rgb;
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
float localContrast(vec2 uv, vec2 px) {
  float c = localLuma(uv);
  float l = localLuma(uv - vec2(px.x, 0.0));
  float r = localLuma(uv + vec2(px.x, 0.0));
  float u = localLuma(uv - vec2(0.0, px.y));
  float d = localLuma(uv + vec2(0.0, px.y));
  return abs(c - l) + abs(c - r) + abs(c - u) + abs(c - d);
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec2 center = vec2(uCenterX, uCenterY);

  float seed = uSeed + (uAnimate > 0.5 ? floor(uTime * 30.0) : 0.0);

  float grain = max(uGrainSize, 1.0);
  vec2 cell = floor(vUv * uResolution / grain);
  vec2 rnd = hash2(cell + seed);

  vec2 offsetPx = vec2(rnd.x * uScatterX, rnd.y * uScatterY);

  int mode = int(uMode + 0.5);
  if (mode == 1) {
    float mag = length(offsetPx);
    float s = sign(rnd.x + rnd.y * 0.001);
    if (s == 0.0) s = 1.0;
    offsetPx = vec2(cos(uAngle), sin(uAngle)) * mag * s;
  } else if (mode == 2) {
    vec2 dir = vUv - center;
    float d = length(dir) + 1e-5;
    dir /= d;
    float mag = length(offsetPx);
    float s = (hash1(cell + seed * 1.7) - 0.5) * 2.0;
    offsetPx = dir * mag * s;
  } else if (mode == 3) {
    vec2 dir = vUv - center;
    float d = length(dir) + 1e-5;
    dir /= d;
    vec2 tangent = vec2(-dir.y, dir.x);
    float mag = length(offsetPx);
    float s = (hash1(cell + seed * 2.3) - 0.5) * 2.0;
    offsetPx = tangent * mag * s;
  }

  if (abs(uBias) > 0.001) {
    float lum = localLuma(vUv);
    float bias = uBias > 0.0
      ? mix(1.0, 2.0 * (1.0 - lum), uBias)
      : mix(1.0, 2.0 * lum,         -uBias);
    offsetPx *= max(bias, 0.0);
  }

  if (uEdgePreserve > 0.001) {
    float ct = localContrast(vUv, px);
    float protect = smoothstep(0.05, 0.4, ct);
    float mask = mix(1.0, protect, uEdgePreserve);
    offsetPx *= mask;
  }

  vec2 offsetUv = offsetPx * px;
  vec2 sampleUv = clamp(vUv + offsetUv * uAmount, 0.0, 1.0);

  vec4 original  = texture2D(uTexture, vUv);
  vec4 scattered = texture2D(uTexture, sampleUv);
  gl_FragColor = mix(original, scattered, uAmount);
}`;

export const scatterEffect: EffectModule = {
  definition: def(
    'scatter',
    'Scatter',
    'stylize',
    'Photoshop-style pixel scatter with grain, directional modes, bias & edge preservation.',
    1,
    [
      // Master
      param({ id: 'amount',    name: 'Amount',           value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uAmount' }),

      // Scatter distance — real pixels
      param({ id: 'scatterX',  name: 'Scatter X (px)',   value: 10,  defaultValue: 10,  min: 0, max: 300, step: 0.5, uniform: 'uScatterX' }),
      param({ id: 'scatterY',  name: 'Scatter Y (px)',   value: 10,  defaultValue: 10,  min: 0, max: 300, step: 0.5, uniform: 'uScatterY' }),

      // Grain: pixels-per-cell that jitter as a group
      param({ id: 'grainSize', name: 'Grain Size (px)',  value: 1,   defaultValue: 1,   min: 1, max: 64, step: 1,   uniform: 'uGrainSize' }),

      // Direction mode
      param({ id: 'mode',      name: 'Direction Mode',   type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Random (all directions)', value: 0 },
          { label: 'Directional (axis)',      value: 1 },
          { label: 'Radial (from center)',    value: 2 },
          { label: 'Swirl (tangent)',         value: 3 },
        ], uniform: 'uMode' }),
      param({ id: 'angle',     name: 'Angle (rad)',      value: 0, defaultValue: 0, min: -3.14159, max: 3.14159, step: 0.01, uniform: 'uAngle' }),

      // Center for radial/swirl
      param({ id: 'centerX',   name: 'Center X',         value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY',   name: 'Center Y',         value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.001, uniform: 'uCenterY' }),

      // Bias by luminance
      param({ id: 'bias',      name: 'Luminance Bias',   value: 0, defaultValue: 0, min: -1, max: 1, step: 0.01, uniform: 'uBias' }),

      // Edge preservation
      param({ id: 'edgePreserve', name: 'Edge Preserve', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uEdgePreserve' }),

      // Animation / seed
      param({ id: 'animate',   name: 'Animate',          type: 'boolean', value: false, defaultValue: false, uniform: 'uAnimate' }),
      param({ id: 'seed',      name: 'Random Seed',      value: 0, defaultValue: 0, min: 0, max: 1000, step: 0.1, uniform: 'uSeed' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};