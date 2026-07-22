import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uPreset;
uniform float uMode;
uniform float uTargetRatio;

uniform float uTopHeight;
uniform float uBotHeight;
uniform float uLeftWidth;
uniform float uRightWidth;

uniform float uFeather;
uniform vec3  uBarColor;
uniform float uOpacity;

uniform float uBorderWidth;
uniform vec3  uBorderColor;

uniform float uBlurBg;
uniform float uDimBg;

uniform float uAnimate;
uniform float uAnimProgress;
uniform float uAnimSide;

varying vec2 vUv;

vec4 sampleBlur(vec2 uv, float radius) {
  vec2 px = 1.0 / uResolution;
  vec4 s = texture2D(uTexture, uv) * 0.36;
  s += texture2D(uTexture, uv + vec2( radius, 0.0) * px) * 0.15;
  s += texture2D(uTexture, uv + vec2(-radius, 0.0) * px) * 0.15;
  s += texture2D(uTexture, uv + vec2(0.0,  radius) * px) * 0.15;
  s += texture2D(uTexture, uv + vec2(0.0, -radius) * px) * 0.15;
  s += texture2D(uTexture, uv + vec2( radius,  radius) * px * 0.7) * 0.01;
  s += texture2D(uTexture, uv + vec2(-radius,  radius) * px * 0.7) * 0.01;
  s += texture2D(uTexture, uv + vec2( radius, -radius) * px * 0.7) * 0.01;
  s += texture2D(uTexture, uv + vec2(-radius, -radius) * px * 0.7) * 0.01;
  return s;
}

// Compute bar heights based on preset target aspect ratio
// canvasRatio = width / height
// targetRatio = desired W/H (e.g. 2.35 for 2.35:1)
// Returns letterbox height (as fraction of canvas height) per side
float presetLetterbox(float targetRatio) {
  float canvasRatio = uResolution.x / uResolution.y;
  if (canvasRatio >= targetRatio) {
    // Canvas is wider than target - no letterbox needed (pillarbox instead but this func handles letterbox)
    return 0.0;
  }
  // Height should shrink so w/h = targetRatio
  // newH = w / targetRatio
  // bars = (canvasH - newH) / 2 in canvas H units
  float visibleH = uResolution.x / targetRatio;
  float barTotalPx = uResolution.y - visibleH;
  return (barTotalPx / uResolution.y) * 0.5;
}

float presetPillarbox(float targetRatio) {
  float canvasRatio = uResolution.x / uResolution.y;
  if (canvasRatio <= targetRatio) {
    return 0.0;
  }
  float visibleW = uResolution.y * targetRatio;
  float barTotalPx = uResolution.x - visibleW;
  return (barTotalPx / uResolution.x) * 0.5;
}

void main() {
  vec4 src = texture2D(uTexture, vUv);

  // ---- Resolve heights/widths based on preset or manual mode ----
  float topH = uTopHeight;
  float botH = uBotHeight;
  float leftW = uLeftWidth;
  float rightW = uRightWidth;

  int preset = int(uPreset + 0.5);
  int mode = int(uMode + 0.5);

  if (preset > 0) {
    // Standard ratios: 1=2.39:1, 2=2.35:1, 3=1.85:1, 4=16:9, 5=4:3, 6=1:1, 7=9:16 (vertical)
    float target = 2.39;
    if (preset == 2) target = 2.35;
    else if (preset == 3) target = 1.85;
    else if (preset == 4) target = 16.0 / 9.0;
    else if (preset == 5) target = 4.0 / 3.0;
    else if (preset == 6) target = 1.0;
    else if (preset == 7) target = 9.0 / 16.0;
    else if (preset == 8) target = uTargetRatio;

    // Decide letterbox vs pillarbox based on current canvas ratio
    float canvasRatio = uResolution.x / uResolution.y;
    if (canvasRatio > target) {
      // Wider than target - use pillarbox (vertical bars)
      float bar = presetPillarbox(target);
      leftW = bar;
      rightW = bar;
      topH = 0.0;
      botH = 0.0;
    } else if (canvasRatio < target) {
      // Taller than target - use letterbox (horizontal bars)
      float bar = presetLetterbox(target);
      topH = bar;
      botH = bar;
      leftW = 0.0;
      rightW = 0.0;
    } else {
      topH = botH = leftW = rightW = 0.0;
    }
  } else {
    // Manual mode - apply position mode filter
    if (mode == 1) { botH = 0.0; leftW = 0.0; rightW = 0.0; }         // Top only
    else if (mode == 2) { topH = 0.0; leftW = 0.0; rightW = 0.0; }    // Bottom only
    else if (mode == 3) { topH = 0.0; botH = 0.0; rightW = 0.0; }     // Left only
    else if (mode == 4) { topH = 0.0; botH = 0.0; leftW = 0.0; }      // Right only
    else if (mode == 5) { leftW = 0.0; rightW = 0.0; }                // Top + Bottom (letterbox)
    else if (mode == 6) { topH = 0.0; botH = 0.0; }                   // Left + Right (pillarbox)
    // mode == 0 = All (top+bot+left+right)
  }

  // ---- Animation ----
  if (uAnimate > 0.5) {
    float p = clamp(uAnimProgress, 0.0, 1.0);
    int side = int(uAnimSide + 0.5);
    if (side == 0) {
      // Slide in from outer edges
      topH *= p; botH *= p; leftW *= p; rightW *= p;
    } else if (side == 1) {
      // Only horizontal animate
      topH *= p; botH *= p;
    } else if (side == 2) {
      // Only vertical animate
      leftW *= p; rightW *= p;
    }
  }

  // ---- Compute masks with feather ----
  float f = max(uFeather, 0.0001);
  float topMask   = 1.0 - smoothstep(1.0 - topH - f, 1.0 - topH + f, vUv.y);
  float botMask   = smoothstep(botH - f, botH + f, vUv.y);
  float leftMask  = smoothstep(leftW - f, leftW + f, vUv.x);
  float rightMask = 1.0 - smoothstep(1.0 - rightW - f, 1.0 - rightW + f, vUv.x);

  // Combined "visible" (non-bar) mask
  float visible = min(min(topMask, botMask), min(leftMask, rightMask));
  float barMask = (1.0 - visible) * uOpacity;

  // ---- Compute inner border mask (if enabled) ----
  float borderMask = 0.0;
  if (uBorderWidth > 0.0001) {
    float bw = uBorderWidth;
    float topEdge = topH > 0.0001 ? smoothstep(1.0 - topH - bw, 1.0 - topH, vUv.y) - smoothstep(1.0 - topH, 1.0 - topH + bw * 0.3, vUv.y) : 0.0;
    float botEdge = botH > 0.0001 ? smoothstep(botH - bw * 0.3, botH, vUv.y) - smoothstep(botH, botH + bw, vUv.y) : 0.0;
    float leftEdge = leftW > 0.0001 ? smoothstep(leftW - bw * 0.3, leftW, vUv.x) - smoothstep(leftW, leftW + bw, vUv.x) : 0.0;
    float rightEdge = rightW > 0.0001 ? smoothstep(1.0 - rightW - bw, 1.0 - rightW, vUv.x) - smoothstep(1.0 - rightW, 1.0 - rightW + bw * 0.3, vUv.x) : 0.0;
    borderMask = max(max(topEdge, botEdge), max(leftEdge, rightEdge));
    borderMask *= visible;  // only show border on the visible side
  }

  // ---- Bar background style ----
  vec3 barContent;
  if (uBlurBg > 0.001 || uDimBg > 0.001) {
    // Blur + dim the source and show that instead of solid color
    vec4 blurred = sampleBlur(vUv, uBlurBg * 8.0);
    vec3 dimmed = blurred.rgb * (1.0 - uDimBg);
    barContent = mix(uBarColor, dimmed, 1.0 - clamp(uDimBg, 0.0, 1.0));
    // If blur > 0 use blurred content, if dim > 0 use dark, mix by which is stronger
    if (uBlurBg > uDimBg) barContent = dimmed;
    else barContent = mix(uBarColor, dimmed, uBlurBg / max(uDimBg, 0.001));
    barContent = mix(uBarColor, dimmed, clamp(uBlurBg, 0.0, 1.0));
  } else {
    barContent = uBarColor;
  }

  // ---- Compose ----
  vec3 result = mix(src.rgb, barContent, barMask);
  result = mix(result, uBorderColor, borderMask);

  gl_FragColor = vec4(result, src.a);
}
`;

export const cinemaBarsEffect: EffectModule = {
  definition: def(
    'cinemaBars',
    'Cinema Bars',
    'stylize',
    'Aspect-ratio-aware letterbox and pillarbox bars with animation, borders, blur & full customization.',
    1,
    [
      // ===== ASPECT PRESET =====
      param({ id: 'preset', name: 'Aspect Preset', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Manual (use sliders)',  value: 0 },
          { label: '2.39:1 (Cinemascope)',  value: 1 },
          { label: '2.35:1 (Anamorphic)',   value: 2 },
          { label: '1.85:1 (Widescreen)',   value: 3 },
          { label: '16:9 (HDTV)',           value: 4 },
          { label: '4:3 (Classic TV)',      value: 5 },
          { label: '1:1 (Square)',          value: 6 },
          { label: '9:16 (Vertical)',       value: 7 },
          { label: 'Custom Ratio',          value: 8 },
        ], uniform: 'uPreset' }),
      param({ id: 'targetRatio', name: 'Custom Ratio (W/H)', value: 2.0, defaultValue: 2.0, min: 0.1, max: 5, step: 0.01, uniform: 'uTargetRatio' }),

      // ===== MANUAL MODE =====
      param({ id: 'mode', name: 'Manual: Position', type: 'select', value: 5, defaultValue: 5,
        options: [
          { label: 'All Sides',           value: 0 },
          { label: 'Top Only',            value: 1 },
          { label: 'Bottom Only',         value: 2 },
          { label: 'Left Only',           value: 3 },
          { label: 'Right Only',          value: 4 },
          { label: 'Top + Bottom (letterbox)', value: 5 },
          { label: 'Left + Right (pillarbox)', value: 6 },
        ], uniform: 'uMode' }),

      param({ id: 'topHeight',  name: 'Manual: Top Height',    value: 0.12, defaultValue: 0.12, min: 0, max: 0.5, step: 0.001, uniform: 'uTopHeight' }),
      param({ id: 'botHeight',  name: 'Manual: Bottom Height', value: 0.12, defaultValue: 0.12, min: 0, max: 0.5, step: 0.001, uniform: 'uBotHeight' }),
      param({ id: 'leftWidth',  name: 'Manual: Left Width',    value: 0.0,  defaultValue: 0.0,  min: 0, max: 0.5, step: 0.001, uniform: 'uLeftWidth' }),
      param({ id: 'rightWidth', name: 'Manual: Right Width',   value: 0.0,  defaultValue: 0.0,  min: 0, max: 0.5, step: 0.001, uniform: 'uRightWidth' }),

      // ===== APPEARANCE =====
      param({ id: 'barColor', name: 'Bar Color', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uBarColor' }),
      param({ id: 'opacity',  name: 'Bar Opacity', value: 1.0,  defaultValue: 1.0,  min: 0, max: 1, step: 0.01, uniform: 'uOpacity' }),
      param({ id: 'feather',  name: 'Edge Feather', value: 0.002, defaultValue: 0.002, min: 0, max: 0.1, step: 0.0005, uniform: 'uFeather' }),

      // ====BORDER =====
      param({ id: 'borderWidth', name: 'Border Width', value: 0.0, defaultValue: 0.0, min: 0, max: 0.05, step: 0.0005, uniform: 'uBorderWidth' }),
      param({ id: 'borderColor', name: 'Border Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uBorderColor' }),

      // ===== BAR CONTENT =====
      param({ id: 'blurBg', name: 'Blur Behind Bars', value: 0.0, defaultValue: 0.0, min: 0, max: 1, step: 0.01, uniform: 'uBlurBg' }),
      param({ id: 'dimBg',  name: 'Dim Behind Bars',  value: 0.0, defaultValue: 0.0, min: 0, max: 1, step: 0.01, uniform: 'uDimBg' }),

      // ===== ANIMATION =====
      param({ id: 'animate',      name: 'Animate Bars In', type: 'boolean', value: false, defaultValue: false, uniform: 'uAnimate' }),
      param({ id: 'animProgress', name: 'Animation Progress', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uAnimProgress' }),
      param({ id: 'animSide', name: 'Animate Side', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'All Bars',        value: 0 },
          { label: 'Horizontal Only', value: 1 },
          { label: 'Vertical Only',   value: 2 },
        ], uniform: 'uAnimSide' }),
    ],
  ),
  fragmentShader: FRAG,
};