import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uThreshold;
uniform float uAutoColor;
uniform vec3 uHudColor;
uniform float uOpacity;

uniform float uBoxCount;
uniform float uBoxSize;
uniform float uBoxSizeVar;
uniform float uBoxThickness;
uniform float uBoxCorners;
uniform float uShowBoxes;

uniform float uShowLines;
uniform float uLineThickness;
uniform float uLineStyle;
uniform float uDashLength;
uniform float uConnectMode;

uniform float uShowMarkers;
uniform float uMarkerSize;
uniform float uMarkerShape;

uniform float uShowLabels;
uniform float uLabelSize;
uniform float uLabelDensity;

uniform float uRandomness;
uniform float uSeed;
uniform float uAnimSpeed;
uniform float uRenderOnAlpha;

varying vec2 vUv;

float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

vec2 hash2(float n) {
  return fract(sin(vec2(n, n + 1.7)) * vec2(43758.5453, 22578.1459));
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 autoPickColor(float seed) {
  vec2 s = fract(vec2(seed * 0.371, seed * 0.617));
  vec3 c = texture2D(uTexture, s).rgb;
  float m = max(max(c.r, c.g), c.b);
  return m > 0.1 ? c / m : vec3(0.4, 1.0, 0.6);
}

float isBlob(vec2 uv) {
  vec3 c = texture2D(uTexture, clamp(uv, 0.0, 1.0)).rgb;
  float l = luma(c);
  float bright = smoothstep(uThreshold, uThreshold + 0.05, l);
  float dark   = smoothstep(uThreshold, uThreshold - 0.05, l);
  return max(bright, dark);
}

// Deterministic blob position for index i - called on demand, no arrays
vec2 blobAt(float i) {
  float ts = uSeed + floor(uTime * uAnimSpeed * 0.5) * 0.1;
  vec2 rnd = hash2(i * 1.71 + ts);

  // Simple feature-biased placement using 3 candidate offsets
  float bias = 1.0 - uRandomness;
  vec2 uv = rnd;

  if (bias > 0.001) {
    vec2 o1 = hash2(i + 100.0 + ts) - 0.5;
    vec2 o2 = hash2(i + 200.0 + ts) - 0.5;
    vec2 c1 = clamp(rnd + o1 * 0.15, 0.05, 0.95);
    vec2 c2 = clamp(rnd + o2 * 0.15, 0.05, 0.95);
    float s0 = isBlob(rnd);
    float s1 = isBlob(c1);
    float s2 = isBlob(c2);
    vec2 best = rnd;
    float bestScore = s0;
    if (s1 > bestScore) { best = c1; bestScore = s1; }
    if (s2 > bestScore) { best = c2; bestScore = s2; }
    uv = mix(uv, best, bias);
  }

  return uv;
}

vec2 blobHalfSize(float i) {
  float sizeRnd = mix(1.0 - uBoxSizeVar, 1.0 + uBoxSizeVar, hash1(i * 3.1 + uSeed));
  float aspect = uResolution.x / uResolution.y;
  return vec2(uBoxSize * sizeRnd * 0.5,
              uBoxSize * sizeRnd * 0.4 * aspect);
}

float rectOutline(vec2 p, vec2 c, vec2 half, float thickness) {
  vec2 d = abs(p - c) - half;
  float outside = max(d.x, d.y);
  if (outside > 0.0) return 0.0;
  float distToEdge = -outside;
  return distToEdge < thickness ? 1.0 : 0.0;
}

float rectSegmented(vec2 p, vec2 c, vec2 half, float thickness, float cornerLen) {
  vec2 rel = p - c;
  vec2 d = abs(rel) - half;
  float outside = max(d.x, d.y);
  if (outside > 0.0) return 0.0;

  float distToEdge = -outside;
  if (distToEdge > thickness) return 0.0;

  vec2 fromCorner = half - abs(rel);
  float corner = min(fromCorner.x, fromCorner.y);
  return corner < cornerLen ? 1.0 : 0.0;
}

float lineSegment(vec2 p, vec2 a, vec2 b, float thickness) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float denom = max(dot(ba, ba), 1e-6);
  float h = clamp(dot(pa, ba) / denom, 0.0, 1.0);
  float d = length(pa - ba * h);
  return d < thickness ? 1.0 : 0.0;
}

float dashedLine(vec2 p, vec2 a, vec2 b, float thickness, float dashLen) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float len = length(ba);
  float denom = max(dot(ba, ba), 1e-6);
  float h = clamp(dot(pa, ba) / denom, 0.0, 1.0);
  float dist = length(pa - ba * h);

  float dashPhase = fract((h * len) / max(dashLen, 0.001));
  float dashOn = dashPhase < 0.5 ? 1.0 : 0.0;

  return (dist < thickness) ? dashOn : 0.0;
}

float markerPlus(vec2 p, vec2 c, float size, float thickness) {
  vec2 d = abs(p - c);
  float h = (d.y < thickness && d.x < size) ? 1.0 : 0.0;
  float v = (d.x < thickness && d.y < size) ? 1.0 : 0.0;
  return max(h, v);
}

float markerDot(vec2 p, vec2 c, float size) {
  return length(p - c) < size ? 1.0 : 0.0;
}

float markerCross(vec2 p, vec2 c, float size, float thickness) {
  vec2 rel = p - c;
  float a1 = abs(rel.x + rel.y);
  float a2 = abs(rel.x - rel.y);
  float maxR = max(abs(rel.x), abs(rel.y));
  return (min(a1, a2) < thickness && maxR < size) ? 1.0 : 0.0;
}

float labelDashes(vec2 p, vec2 pos, float size, float seed) {
  vec2 rel = (p - pos) / max(size, 1e-4);
  if (abs(rel.y) > 0.35) return 0.0;
  if (rel.x < 0.0 || rel.x > 10.0) return 0.0;
  float charIdx = floor(rel.x);
  float charFrac = fract(rel.x);
  float visible = hash1(seed * 7.13 + charIdx);
  if (visible < 0.15) return 0.0;
  if (charFrac < 0.15 || charFrac > 0.85) return 0.0;
  return 1.0;
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec4 src = texture2D(uTexture, vUv);

  vec3 hudColor = uAutoColor > 0.5 ? autoPickColor(uSeed) : uHudColor;

  float boxCountF = clamp(uBoxCount, 1.0, 16.0);
  float hudMask = 0.0;

  // ---- Draw boxes and markers in one loop ----
  for (int i = 0; i < 16; i++) {
    if (float(i) >= boxCountF) break;
    float fi = float(i);
    vec2 c = blobAt(fi);
    vec2 half = blobHalfSize(fi);

    if (uShowBoxes > 0.5) {
      float t = uBoxThickness * px.x * 2.0;
      float boxMask;
      if (uBoxCorners > 0.5) {
        float cornerLen = min(half.x, half.y) * 0.35;
        boxMask = rectSegmented(vUv, c, half, t, cornerLen);
      } else {
        boxMask = rectOutline(vUv, c, half, t);
      }
      hudMask = max(hudMask, boxMask);
    }

    if (uShowMarkers > 0.5) {
      float sz = uMarkerSize * px.x * 8.0;
      float th = uLineThickness * px.x * 1.5;
      int shape = int(uMarkerShape + 0.5);
      float m = 0.0;
      if (shape == 0) m = markerPlus(vUv, c, sz, th);
      else if (shape == 1) m = markerDot(vUv, c, sz);
      else m = markerCross(vUv, c, sz, th);
      hudMask = max(hudMask, m);
    }

    if (uShowLabels > 0.5) {
      float labelCount = boxCountF * uLabelDensity;
      if (fi < labelCount) {
        vec2 labelPos = c + vec2(half.x + 0.005, -half.y);
        float lm = labelDashes(vUv, labelPos, uLabelSize * px.x * 12.0, fi + uSeed);
        hudMask = max(hudMask, lm * 0.7);
      }
    }
  }

  // ---- Connection lines: separate double loop, no continues ----
  if (uShowLines > 0.5 && boxCountF > 1.5) {
    int mode = int(uConnectMode + 0.5);
    float t = uLineThickness * px.x;

    for (int a = 0; a < 16; a++) {
      if (float(a) >= boxCountF) break;
      vec2 pa = blobAt(float(a));

      for (int b = 0; b < 16; b++) {
        if (float(b) >= boxCountF) break;
        if (b > a) {
          vec2 pb = blobAt(float(b));

          float draw = 0.0;
          if (mode == 0) {
            if (b == a + 1) draw = 1.0;
          } else if (mode == 1) {
            if (a == 0) draw = 1.0;
          } else if (mode == 2) {
            draw = 1.0;
          } else {
            float d = distance(pa, pb);
            if (d < 0.35) draw = 1.0;
          }

          if (draw > 0.5) {
            float lm;
            if (uLineStyle > 0.5) {
              lm = dashedLine(vUv, pa, pb, t, uDashLength);
            } else {
              lm = lineSegment(vUv, pa, pb, t);
            }
            hudMask = max(hudMask, lm * 0.9);
          }
        }
      }
    }
  }

  vec3 hudDraw = hudColor * hudMask * uOpacity;

  if (uRenderOnAlpha > 0.5) {
    gl_FragColor = vec4(hudColor, hudMask * uOpacity);
    return;
  }

  vec3 result = src.rgb + hudDraw;
  gl_FragColor = vec4(result, src.a);
}
`;

export const traceryEffect: EffectModule = {
  definition: def(
    'tracery',
    'Tracery HUD',
    'generate',
    'Procedural HUD overlay: bounding boxes, connection lines, markers and coordinate labels driven by image features.',
    1,
    [
      param({ id: 'threshold', name: 'Threshold', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'randomness', name: 'Randomness', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uRandomness' }),
      param({ id: 'seed', name: 'Random Seed', value: 0, defaultValue: 0, min: 0, max: 1000, step: 0.1, uniform: 'uSeed' }),
      param({ id: 'animSpeed', name: 'Animate Speed', value: 1.0, defaultValue: 1.0, min: 0, max: 10, step: 0.05, uniform: 'uAnimSpeed' }),

      param({ id: 'autoColor', name: 'Auto-Pick Color', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoColor' }),
      param({ id: 'hudColor', name: 'HUD Color', type: 'color', value: '#00ff88', defaultValue: '#00ff88', uniform: 'uHudColor' }),
      param({ id: 'opacity', name: 'Opacity', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uOpacity' }),

      param({ id: 'showBoxes', name: 'Show Boxes', type: 'boolean', value: true, defaultValue: true, uniform: 'uShowBoxes' }),
      param({ id: 'boxCount', name: 'Box Count', value: 8, defaultValue: 8, min: 1, max: 16, step: 1, uniform: 'uBoxCount' }),
      param({ id: 'boxSize', name: 'Box Size', value: 0.1, defaultValue: 0.1, min: 0.02, max: 0.5, step: 0.005, uniform: 'uBoxSize' }),
      param({ id: 'boxSizeVar', name: 'Size Variance', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uBoxSizeVar' }),
      param({ id: 'boxThickness', name: 'Box Thickness', value: 1.0, defaultValue: 1.0, min: 0.5, max: 5, step: 0.1, uniform: 'uBoxThickness' }),
      param({ id: 'boxCorners', name: 'Segmented Corners', type: 'boolean', value: false, defaultValue: false, uniform: 'uBoxCorners' }),

      param({ id: 'showLines', name: 'Show Lines', type: 'boolean', value: true, defaultValue: true, uniform: 'uShowLines' }),
      param({ id: 'lineThickness', name: 'Line Thickness', value: 1.0, defaultValue: 1.0, min: 0.3, max: 5, step: 0.1, uniform: 'uLineThickness' }),
      param({ id: 'connectMode', name: 'Connect Mode', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Sequential', value: 0 },
          { label: 'Star',       value: 1 },
          { label: 'Full Mesh',  value: 2 },
          { label: 'Nearest',    value: 3 },
        ], uniform: 'uConnectMode' }),
      param({ id: 'lineStyle', name: 'Dashed Lines', type: 'boolean', value: true, defaultValue: true, uniform: 'uLineStyle' }),
      param({ id: 'dashLength', name: 'Dash Length', value: 0.015, defaultValue: 0.015, min: 0.002, max: 0.1, step: 0.001, uniform: 'uDashLength' }),

      param({ id: 'showMarkers', name: 'Show Markers', type: 'boolean', value: true, defaultValue: true, uniform: 'uShowMarkers' }),
      param({ id: 'markerShape', name: 'Marker Shape', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Plus',  value: 0 },
          { label: 'Dot',   value: 1 },
          { label: 'Cross', value: 2 },
        ], uniform: 'uMarkerShape' }),
      param({ id: 'markerSize', name: 'Marker Size', value: 1.0, defaultValue: 1.0, min: 0.2, max: 5, step: 0.1, uniform: 'uMarkerSize' }),

      param({ id: 'showLabels', name: 'Show Coord Labels', type: 'boolean', value: true, defaultValue: true, uniform: 'uShowLabels' }),
      param({ id: 'labelSize', name: 'Label Size', value: 1.0, defaultValue: 1.0, min: 0.3, max: 3, step: 0.05, uniform: 'uLabelSize' }),
      param({ id: 'labelDensity', name: 'Label Density', value: 0.6, defaultValue: 0.6, min: 0, max: 1, step: 0.01, uniform: 'uLabelDensity' }),

      param({ id: 'renderOnAlpha', name: 'Render on Alpha', type: 'boolean', value: false, defaultValue: false, uniform: 'uRenderOnAlpha' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};