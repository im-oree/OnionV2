import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;

uniform float uStyle;
uniform float uAmount;
uniform float uSize;
uniform float uSmoothness;
uniform float uRoundness;
uniform float uShape;
uniform float uCenterX;
uniform float uCenterY;
uniform float uRotation;
uniform float uAspectMode;
uniform vec3  uColor;
uniform float uHighlightAmount;
uniform vec3  uHighlightColor;
uniform float uBlendMode;
uniform float uFalloffCurve;
uniform float uSaturationLoss;
uniform float uContrastGain;
uniform float uNoise;
uniform float uMix;
uniform float uTime;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

struct Cfg {
  float amount;
  float size;
  float smoothness;
  float roundness;
  float shape;
  float rotation;
  vec3  color;
  float highlightAmount;
  vec3  highlightColor;
  float falloffCurve;
  float saturationLoss;
  float contrastGain;
  float noise;
};

Cfg presetClassic() {
  return Cfg(0.55, 0.7, 0.5, 1.0, 0.0, 0.0, vec3(0.0), 0.0, vec3(1.0), 1.0, 0.0, 0.0, 0.0);
}
Cfg presetSubtle() {
  return Cfg(0.25, 0.85, 0.7, 1.0, 0.0, 0.0, vec3(0.0), 0.0, vec3(1.0), 1.2, 0.0, 0.0, 0.0);
}
Cfg presetDramatic() {
  return Cfg(0.85, 0.5, 0.4, 1.0, 0.0, 0.0, vec3(0.0), 0.0, vec3(1.0), 1.4, 0.15, 0.15, 0.0);
}
Cfg presetCinematic() {
  return Cfg(0.6, 0.65, 0.55, 1.15, 0.0, 0.0, vec3(0.02, 0.02, 0.04), 0.15, vec3(1.0, 0.9, 0.7), 1.3, 0.2, 0.1, 0.0);
}
Cfg presetWarmGlow() {
  return Cfg(0.35, 0.75, 0.65, 1.0, 0.0, 0.0, vec3(0.15, 0.08, 0.02), 0.25, vec3(1.0, 0.9, 0.75), 1.1, 0.0, 0.05, 0.0);
}
Cfg presetLomo() {
  return Cfg(0.9, 0.55, 0.35, 1.0, 0.0, 0.0, vec3(0.0), 0.1, vec3(1.0, 0.95, 0.85), 1.6, 0.1, 0.2, 0.02);
}
Cfg presetTiltShift() {
  return Cfg(0.7, 0.5, 0.25, 0.4, 1.0, 0.0, vec3(0.0), 0.0, vec3(1.0), 1.0, 0.0, 0.0, 0.0);
}
Cfg presetSpotlight() {
  return Cfg(0.75, 0.4, 0.6, 1.0, 0.0, 0.0, vec3(0.0), 0.5, vec3(1.0, 0.95, 0.85), 1.5, 0.25, 0.15, 0.0);
}
Cfg presetVintage() {
  return Cfg(0.65, 0.7, 0.6, 1.05, 0.0, 0.0, vec3(0.12, 0.08, 0.04), 0.0, vec3(1.0), 1.2, 0.3, 0.1, 0.05);
}
Cfg presetCustom() {
  return Cfg(uAmount, uSize, uSmoothness, uRoundness, uShape, uRotation, uColor, uHighlightAmount, uHighlightColor, uFalloffCurve, uSaturationLoss, uContrastGain, uNoise);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetClassic();
  if (s == 1) return presetSubtle();
  if (s == 2) return presetDramatic();
  if (s == 3) return presetCinematic();
  if (s == 4) return presetWarmGlow();
  if (s == 5) return presetLomo();
  if (s == 6) return presetTiltShift();
  if (s == 7) return presetSpotlight();
  if (s == 8) return presetVintage();
  return presetCustom();
}

// Compute the shape distance from center
float shapeDistance(vec2 p, float shape, float roundness) {
  int sh = int(shape + 0.5);
  if (sh == 0) {
    // Circular / elliptical
    return length(p);
  } else if (sh == 1) {
    // Rounded rectangle
    vec2 ap = abs(p);
    float chebyshev = max(ap.x, ap.y);
    float euclid = length(p);
    return mix(chebyshev, euclid, roundness);
  } else if (sh == 2) {
    // Diamond
    return abs(p.x) + abs(p.y);
  } else {
    // Square (hard rectangular)
    return max(abs(p.x), abs(p.y));
  }
}

vec3 desaturate(vec3 c, float amount) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(c, vec3(l), amount);
}

vec3 applyContrast(vec3 c, float amount) {
  return (c - 0.5) * (1.0 + amount) + 0.5;
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  // Aspect handling
  vec2 center = vec2(uCenterX, uCenterY);
  vec2 p = vUv - center;

  int aspectMode = int(uAspectMode + 0.5);
  if (aspectMode == 1) {
    // Force circular regardless of canvas aspect
    p.x *= uResolution.x / uResolution.y;
  }
  // aspectMode 0 = follow canvas (natural oval on wide)

  // Roundness axis stretch
  float r = clamp(cfg.roundness, 0.1, 3.0);
  p.y /= r;

  // Rotation
  float rot = cfg.rotation;
  if (abs(rot) > 0.001) {
    float c = cos(rot);
    float s = sin(rot);
    p = mat2(c, -s, s, c) * p;
  }

  // Shape distance (0..~1.4 typical)
  float dist = shapeDistance(p, cfg.shape, r);

  // Size / smoothness -> falloff mask
  // uSize: 0 = tiny vignette (all dark), 1 = huge (barely dark)
  float sizeRadius = mix(0.15, 0.9, clamp(cfg.size, 0.0, 1.0));
  float feather    = max(cfg.smoothness, 0.001);
  float edgeStart  = sizeRadius * (1.0 - feather);
  float edgeEnd    = sizeRadius + feather * 0.5;

  float vig = smoothstep(edgeStart, edgeEnd, dist);

  // Falloff curve: reshape the smooth transition
  vig = pow(vig, max(cfg.falloffCurve, 0.01));

  // Highlight (bright center)
  float highlightMask = 1.0 - smoothstep(0.0, sizeRadius * 0.6, dist);
  highlightMask = pow(highlightMask, 1.5);

  // ---- Compose ----
  vec3 col = src.rgb;

  // Apply highlight
  if (cfg.highlightAmount > 0.001) {
    col += cfg.highlightColor * highlightMask * cfg.highlightAmount;
  }

  // Saturation loss + contrast at edges
  vec3 edgeCol = col;
  if (cfg.saturationLoss > 0.001) {
    edgeCol = desaturate(edgeCol, cfg.saturationLoss);
  }
  if (abs(cfg.contrastGain) > 0.001) {
    edgeCol = applyContrast(edgeCol, cfg.contrastGain);
  }
  col = mix(col, edgeCol, vig);

  // Apply vignette darkness via blend mode
  int blend = int(uBlendMode + 0.5);
  vec3 vigTinted = cfg.color;

  if (blend == 0) {
    // Mix (standard) - fade toward color
    col = mix(col, vigTinted, vig * cfg.amount);
  } else if (blend == 1) {
    // Multiply - darkens more naturally
    vec3 mult = mix(vec3(1.0), vigTinted, vig * cfg.amount);
    col *= mult;
  } else if (blend == 2) {
    // Screen (for bright vignette colors)
    vec3 s2 = 1.0 - (1.0 - col) * (1.0 - vigTinted * vig * cfg.amount);
    col = s2;
  } else {
    // Overlay - contrast-preserving darken
    vec3 overlay;
    for (int i = 0; i < 3; i++) {
      float base = col[i];
      float over = vigTinted[i] * vig * cfg.amount;
      overlay[i] = base < 0.5
        ? 2.0 * base * (1.0 - over)
        : 1.0 - 2.0 * (1.0 - base) * (1.0 - (1.0 - over));
    }
    col = overlay;
  }

  // Optional noise (film grain in the vignette)
  if (cfg.noise > 0.001) {
    float n = hash(vUv * uResolution + uTime * 0.1) - 0.5;
    col += vec3(n) * cfg.noise * vig;
  }

  col = mix(src.rgb, col, clamp(uMix, 0.0, 1.0));
  gl_FragColor = vec4(clamp(col, 0.0, 1.5), src.a);
}
`;

export const vignetteEffect: EffectModule = {
  definition: def(
    'vignette',
    'Vignette',
    'stylize',
    'Cinematic vignette with 9 presets, custom shapes, blend modes, highlights and edge grading.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Style Preset', type: 'select', value: 3, defaultValue: 3,
        options: [
          { label: 'Classic',      value: 0 },
          { label: 'Subtle',       value: 1 },
          { label: 'Dramatic',     value: 2 },
          { label: 'Cinematic',    value: 3 },
          { label: 'Warm Glow',    value: 4 },
          { label: 'Lomo',         value: 5 },
          { label: 'Tilt-Shift',   value: 6 },
          { label: 'Spotlight',    value: 7 },
          { label: 'Vintage',      value: 8 },
          { label: 'Custom',       value: 9 },
        ], uniform: 'uStyle' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),
      param({ id: 'time', name: 'Noise Time', value: 0, defaultValue: 0, min: 0, max: 1000, step: 0.1, uniform: 'uTime' }),

      // ===== POSITION & SHAPE (always active) =====
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uCenterY' }),
      param({ id: 'aspectMode', name: 'Aspect', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Follow Canvas (oval on wide)', value: 0 },
          { label: 'Force Circular',                value: 1 },
        ], uniform: 'uAspectMode' }),
      param({ id: 'blendMode', name: 'Blend Mode', type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Mix',       value: 0 },
          { label: 'Multiply',  value: 1 },
          { label: 'Screen',    value: 2 },
          { label: 'Overlay',   value: 3 },
        ], uniform: 'uBlendMode' }),

      // ===== CUSTOM: Basics =====
      param({ id: 'amount',      name: 'Custom: Amount',      value: 0.55, defaultValue: 0.55, min: 0, max: 1.5, step: 0.01, uniform: 'uAmount' }),
      param({ id: 'size',        name: 'Custom: Size',        value: 0.7,  defaultValue: 0.7,  min: 0, max: 1, step: 0.01, uniform: 'uSize' }),
      param({ id: 'smoothness',  name: 'Custom: Smoothness',  value: 0.5,  defaultValue: 0.5,  min: 0.01, max: 1, step: 0.01, uniform: 'uSmoothness' }),
      param({ id: 'falloffCurve', name: 'Custom: Falloff Curve', value: 1.0, defaultValue: 1.0, min: 0.2, max: 4, step: 0.05, uniform: 'uFalloffCurve' }),

      // ===== CUSTOM: Shape =====
      param({ id: 'shape', name: 'Custom: Shape', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Circle / Oval',      value: 0 },
          { label: 'Rounded Rectangle',  value: 1 },
          { label: 'Diamond',            value: 2 },
          { label: 'Square',             value: 3 },
        ], uniform: 'uShape' }),
      param({ id: 'roundness', name: 'Custom: Roundness / Y-Stretch', value: 1.0, defaultValue: 1.0, min: 0.2, max: 3, step: 0.01, uniform: 'uRoundness' }),
      param({ id: 'rotation',  name: 'Custom: Rotation (rad)', value: 0, defaultValue: 0, min: -3.14159, max: 3.14159, step: 0.01, uniform: 'uRotation' }),

      // ===== CUSTOM: Color =====
      param({ id: 'color', name: 'Custom: Edge Color', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColor' }),

      // ===== CUSTOM: Highlights =====
      param({ id: 'highlightAmount', name: 'Custom: Highlight Amount', value: 0, defaultValue: 0, min: 0, max: 2, step: 0.01, uniform: 'uHighlightAmount' }),
      param({ id: 'highlightColor',  name: 'Custom: Highlight Color', type: 'color', value: '#ffe6b0', defaultValue: '#ffe6b0', uniform: 'uHighlightColor' }),

      // ===== CUSTOM: Edge Grading =====
      param({ id: 'saturationLoss', name: 'Custom: Edge Desaturation', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01, uniform: 'uSaturationLoss' }),
      param({ id: 'contrastGain',   name: 'Custom: Edge Contrast',     value: 0, defaultValue: 0, min: -1, max: 1, step: 0.01, uniform: 'uContrastGain' }),
      param({ id: 'noise',          name: 'Custom: Edge Noise',        value: 0, defaultValue: 0, min: 0, max: 0.3, step: 0.005, uniform: 'uNoise' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};