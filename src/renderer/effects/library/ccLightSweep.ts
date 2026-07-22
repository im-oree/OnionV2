import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;
uniform float uTime;

uniform float uCenterX;
uniform float uCenterY;
uniform float uDirection;
uniform float uShape;
uniform float uWidth;
uniform float uSweepIntensity;
uniform float uEdgeIntensity;
uniform float uEdgeThickness;
uniform vec3  uLightColor;
uniform float uLightReception;
uniform float uMix;

uniform float uAutoAnimate;
uniform float uFrequency;
uniform float uInterval;
uniform float uProgress;
uniform float uSweepRange;

varying vec2 vUv;

const float PI = 3.14159265;

float sweepProfile(float x, float shape) {
  x = clamp(abs(x), 0.0, 1.0);
  float sharp = 1.0 - x;
  float smoothP = 0.5 + 0.5 * cos(x * PI);
  return mix(sharp, smoothP, shape);
}

float edgeProfile(float x, float thickness) {
  x = abs(x);
  float edgeCenter = 1.0 - thickness;
  float halfT = thickness * 0.5;
  float d = abs(x - edgeCenter) / max(halfT, 0.001);
  return max(0.0, 1.0 - d);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 center = vec2(uCenterX, uCenterY);

  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - center) * vec2(aspect, 1.0);
  float diag = length(vec2(aspect, 1.0));

  float rad = uDirection * PI / 180.0;
  vec2 dir = vec2(cos(rad), sin(rad));

  float projected = dot(p, dir);

  float progress;
  if (uAutoAnimate > 0.5) {
    float sweepTime = 1.0 / max(uFrequency, 0.001);
    float period = sweepTime + uInterval;
    float phase = mod(uTime, period) / period;
    float sweepPortion = sweepTime / period;
    if (phase < sweepPortion) {
      progress = phase / sweepPortion;
    } else {
      progress = 1.5;
    }
  } else {
    progress = uProgress;
  }

  float sweepPos = mix(-uSweepRange, uSweepRange, progress);

  float halfW = max(uWidth * diag * 0.5, 0.001);
  float sweepDist = (projected - sweepPos) / halfW;

  float band = sweepProfile(sweepDist, uShape);
  float edge = edgeProfile(sweepDist, clamp(uEdgeThickness, 0.05, 1.0));
  edge = max(edge - band * 0.3, 0.0);

  vec3 sweepCol = uLightColor * (band * uSweepIntensity + edge * uEdgeIntensity);
  float sweepMask = clamp(band * uSweepIntensity + edge * uEdgeIntensity, 0.0, 4.0);

  vec3 outCol;
  int mode = int(uLightReception + 0.5);
  if (mode == 1) {
    float alphaMask = clamp(sweepMask, 0.0, 1.0);
    outCol = src.rgb * alphaMask + sweepCol * 0.3;
    gl_FragColor = vec4(mix(src.rgb, outCol, uMix), src.a * mix(1.0, alphaMask, uMix));
    return;
  } else if (mode == 2) {
    outCol = src.rgb + sweepCol;
  } else {
    vec3 a = clamp(src.rgb, 0.0, 1.0);
    vec3 b = clamp(sweepCol, 0.0, 1.0);
    outCol = 1.0 - (1.0 - a) * (1.0 - b);
    outCol += max(sweepCol - 1.0, 0.0);
  }

  gl_FragColor = vec4(mix(src.rgb, outCol, uMix), src.a);
}
`;

export const ccLightSweepEffect: EffectModule = {
  definition: def(
    'ccLightSweep',
    'CC Light Sweep',
    'generate',
    'AE-grade animated light sweep / glint with auto-animation frequency and interval.',
    1,
    [
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterY' }),

      param({ id: 'direction', name: 'Direction (deg)', value: -30, defaultValue: -30, min: -180, max: 180, step: 0.5, uniform: 'uDirection' }),
      param({ id: 'shape', name: 'Shape', type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Sharp',  value: 0 },
          { label: 'Smooth', value: 1 },
        ], uniform: 'uShape' }),
      param({ id: 'width', name: 'Width', value: 0.25, defaultValue: 0.25, min: 0.01, max: 2, step: 0.005, uniform: 'uWidth' }),

      param({ id: 'sweepIntensity', name: 'Sweep Intensity', value: 1.0, defaultValue: 1.0, min: 0, max: 5, step: 0.05, uniform: 'uSweepIntensity' }),
      param({ id: 'edgeIntensity',  name: 'Edge Intensity',  value: 0.7, defaultValue: 0.7, min: 0, max: 5, step: 0.05, uniform: 'uEdgeIntensity' }),
      param({ id: 'edgeThickness',  name: 'Edge Thickness',  value: 0.15, defaultValue: 0.15, min: 0.05, max: 1, step: 0.01, uniform: 'uEdgeThickness' }),

      param({ id: 'lightColor', name: 'Light Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uLightColor' }),

      param({ id: 'lightReception', name: 'Light Reception', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Composite', value: 0 },
          { label: 'Cutout',    value: 1 },
          { label: 'Add',       value: 2 },
        ], uniform: 'uLightReception' }),
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),

      param({ id: 'autoAnimate', name: 'Auto Animate', type: 'boolean', value: true, defaultValue: true, uniform: 'uAutoAnimate' }),
      param({ id: 'frequency',   name: 'Frequency (Hz)',    value: 0.5, defaultValue: 0.5, min: 0.05, max: 10, step: 0.05, uniform: 'uFrequency' }),
      param({ id: 'interval',    name: 'Interval (sec)',    value: 1.0, defaultValue: 1.0, min: 0, max: 20, step: 0.1, uniform: 'uInterval' }),
      param({ id: 'progress',    name: 'Progress (manual)', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uProgress' }),
      param({ id: 'sweepRange',  name: 'Sweep Range',       value: 1.2, defaultValue: 1.2, min: 0.5, max: 3, step: 0.05, uniform: 'uSweepRange' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};