import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;
uniform float uAngle;
uniform float uRadius;
uniform float uCenterX;
uniform float uCenterY;
uniform float uFalloffCurve;
uniform float uSpiralTightness;
uniform float uRippleFreq;
uniform float uRippleAmp;
uniform float uSecondCount;
uniform float uAspectMode;
uniform float uAutoAnimate;
uniform float uAnimSpeed;
uniform float uEdgeMode;
uniform float uChroma;
uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

vec4 safeSample(vec2 uv) {
  int edge = int(uEdgeMode + 0.5);
  if (edge == 0) {
    // Clamp
    return texture2D(uTexture, clamp(uv, 0.0, 1.0));
  } else if (edge == 1) {
    // Transparent outside
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture2D(uTexture, uv);
  } else if (edge == 2) {
    // Mirror
    vec2 m = uv;
    if (m.x < 0.0) m.x = -m.x;
    if (m.x > 1.0) m.x = 2.0 - m.x;
    if (m.y < 0.0) m.y = -m.y;
    if (m.y > 1.0) m.y = 2.0 - m.y;
    return texture2D(uTexture, clamp(m, 0.0, 1.0));
  }
  // Repeat
  return texture2D(uTexture, fract(uv));
}

vec2 twirlSingle(vec2 p, vec2 center, float angleRad, float radius, float curve, float aspect) {
  vec2 rel = (p - center);
  rel.x *= aspect;
  float dist = length(rel);
  float t = clamp(dist / max(radius, 0.001), 0.0, 1.0);
  // Falloff curve
  float falloff = pow(1.0 - t, curve);
  float rot = angleRad * falloff;
  float c = cos(rot);
  float s = sin(rot);
  vec2 rotated = mat2(c, -s, s, c) * rel;
  rotated.x /= aspect;
  return center + rotated;
}

vec2 twirlSpiral(vec2 p, vec2 center, float angleRad, float radius, float curve, float tight, float aspect) {
  vec2 rel = (p - center);
  rel.x *= aspect;
  float dist = length(rel);
  float t = clamp(dist / max(radius, 0.001), 0.0, 1.0);
  // Spiral: rotation is linear with distance rather than falling off
  float falloff = pow(1.0 - t, curve);
  float rot = angleRad * falloff + dist * tight * 20.0;
  float c = cos(rot);
  float s = sin(rot);
  vec2 rotated = mat2(c, -s, s, c) * rel;
  rotated.x /= aspect;
  return center + rotated;
}

vec2 twirlRipple(vec2 p, vec2 center, float angleRad, float radius, float freq, float amp, float aspect) {
  vec2 rel = (p - center);
  rel.x *= aspect;
  float dist = length(rel);
  float t = clamp(dist / max(radius, 0.001), 0.0, 1.0);
  // Rotation oscillates with distance
  float wave = sin(dist * freq * 20.0) * amp;
  float falloff = 1.0 - t;
  falloff = falloff * falloff;
  float rot = angleRad * falloff * (0.5 + wave);
  float c = cos(rot);
  float s = sin(rot);
  vec2 rotated = mat2(c, -s, s, c) * rel;
  rotated.x /= aspect;
  return center + rotated;
}

vec2 twirlMulti(vec2 p, float angleRad, float radius, float curve, float count, float aspect) {
  int n = int(clamp(count, 1.0, 8.0));
  vec2 result = p;
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    float fi = float(i);
    float ang = fi / float(n) * 6.28318;
    vec2 c = vec2(0.5) + vec2(cos(ang), sin(ang)) * 0.25;
    // Alternate rotation directions for pinwheel effect
    float dirSign = mod(fi, 2.0) < 1.0 ? 1.0 : -1.0;
    result = twirlSingle(result, c, angleRad * dirSign, radius * 0.6, curve, aspect);
  }
  return result;
}

vec2 applyTwirl(vec2 p, float aspect) {
  vec2 center = vec2(uCenterX, uCenterY);
  float finalAngle = radians(uAngle);
  if (uAutoAnimate > 0.5) {
    finalAngle += uTime * uAnimSpeed;
  }

  int style = int(uStyle + 0.5);
  if (style == 0) {
    return twirlSingle(p, center, finalAngle, uRadius, uFalloffCurve, aspect);
  } else if (style == 1) {
    return twirlSpiral(p, center, finalAngle, uRadius, uFalloffCurve, uSpiralTightness, aspect);
  } else if (style == 2) {
    return twirlRipple(p, center, finalAngle, uRadius, uFalloffCurve, uRippleFreq, uRippleAmp);
  } else if (style == 3) {
    return twirlMulti(p, finalAngle, uRadius, uFalloffCurve, uSecondCount, aspect);
  } else if (style == 4) {
    // Reverse twirl (outside spins, center stays)
    vec2 rel = p - center;
    rel.x *= aspect;
    float dist = length(rel);
    float t = clamp(dist / max(uRadius, 0.001), 0.0, 1.0);
    float rot = finalAngle * pow(t, uFalloffCurve);
    float c = cos(rot);
    float s = sin(rot);
    vec2 rotated = mat2(c, -s, s, c) * rel;
    rotated.x /= aspect;
    return center + rotated;
  }
  // Style 5: Pinch twirl (twirl + zoom in)
  vec2 twisted = twirlSingle(p, center, finalAngle, uRadius, uFalloffCurve, aspect);
  vec2 rel = twisted - center;
  float dist = length(rel);
  float t = clamp(dist / max(uRadius, 0.001), 0.0, 1.0);
  float scale = 1.0 + (1.0 - t) * 0.5;
  return center + rel * scale;
}

void main() {
  vec4 src = texture2D(uTexture, vUv);

  int aspectMode = int(uAspectMode + 0.5);
  float aspect = 1.0;
  if (aspectMode == 1) {
    aspect = uResolution.x / uResolution.y;
  }

  vec2 uv = applyTwirl(vUv, aspect);

  vec4 result;
  if (uChroma > 0.001) {
    vec2 dir = uv - vUv;
    float len = length(dir);
    vec2 nDir = len > 1e-5 ? dir / len : vec2(0.0);
    float caAmt = uChroma * 0.008 * len * 10.0;
    result.r = safeSample(uv + nDir * caAmt).r;
    result.g = safeSample(uv).g;
    result.b = safeSample(uv - nDir * caAmt).b;
    result.a = safeSample(uv).a;
  } else {
    result = safeSample(uv);
  }

  vec3 mixed = mix(src.rgb, result.rgb, clamp(uMix, 0.0, 1.0));
  float a = mix(src.a, result.a, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(mixed, a);
}
`;

export const twirlEffect: EffectModule = {
  definition: def(
    'twirl',
    'Twirl',
    'distort',
    'Rotational distortion with 6 styles: single, spiral, ripple, multi-vortex, reverse, pinch-twirl.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Single Twirl',        value: 0 },
          { label: 'Spiral',              value: 1 },
          { label: 'Ripple Twirl',        value: 2 },
          { label: 'Multi-Vortex',        value: 3 },
          { label: 'Reverse (edge spin)', value: 4 },
          { label: 'Pinch + Twirl',       value: 5 },
        ], uniform: 'uStyle' }),

      // ===== GLOBAL =====
      param({ id: 'angle',  name: 'Angle (deg)', value: 90,  defaultValue: 90,  min: -1440, max: 1440, step: 1, uniform: 'uAngle' }),
      param({ id: 'radius', name: 'Radius',      value: 0.5, defaultValue: 0.5, min: 0.01, max: 2,     step: 0.005, uniform: 'uRadius' }),
      param({ id: 'centerX', name: 'Center X',   value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y',   value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterY' }),
      param({ id: 'falloffCurve', name: 'Falloff Curve', value: 2.0, defaultValue: 2.0, min: 0.3, max: 6, step: 0.05, uniform: 'uFalloffCurve' }),

      // ===== ASPECT / EDGE =====
      param({ id: 'aspectMode', name: 'Aspect', type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Canvas (oval on wide)', value: 0 },
          { label: 'Circular',               value: 1 },
        ], uniform: 'uAspectMode' }),
      param({ id: 'edgeMode', name: 'Edge Behavior', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Clamp',       value: 0 },
          { label: 'Transparent', value: 1 },
          { label: 'Mirror',      value: 2 },
          { label: 'Repeat',      value: 3 },
        ], uniform: 'uEdgeMode' }),

      // ===== ANIMATION =====
      param({ id: 'autoAnimate', name: 'Auto Animate', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoAnimate' }),
      param({ id: 'animSpeed',   name: 'Animation Speed', value: 1.0, defaultValue: 1.0, min: -10, max: 10, step: 0.05, uniform: 'uAnimSpeed' }),

      // ===== STYLE-SPECIFIC =====
      param({ id: 'spiralTightness', name: 'Spiral: Tightness', value: 0.3, defaultValue: 0.3, min: 0, max: 3, step: 0.01, uniform: 'uSpiralTightness' }),
      param({ id: 'rippleFreq',      name: 'Ripple: Frequency', value: 3.0, defaultValue: 3.0, min: 0.5, max: 20, step: 0.1, uniform: 'uRippleFreq' }),
      param({ id: 'rippleAmp',       name: 'Ripple: Amplitude', value: 0.5, defaultValue: 0.5, min: 0, max: 2, step: 0.01, uniform: 'uRippleAmp' }),
      param({ id: 'secondCount',     name: 'Multi: Vortex Count', value: 4, defaultValue: 4, min: 1, max: 8, step: 1, uniform: 'uSecondCount' }),

      // ===== EXTRAS =====
      param({ id: 'chroma', name: 'Chromatic Aberration', value: 0, defaultValue: 0, min: 0, max: 2, step: 0.01, uniform: 'uChroma' }),
      param({ id: 'mix',    name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};