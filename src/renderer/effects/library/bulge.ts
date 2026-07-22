import type { EffectModule } from './types';
import { def, param } from './types';

export const bulgeEffect: EffectModule = {
  definition: def(
    'bulge',
    'Bulge / Warp',
    'distort',
    'AE-style bulge, wide-angle FOV suck, or spiral collapse. Fully animatable.',
    1,
    [
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: -0.2, max: 1.2, step: 0.001, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: -0.2, max: 1.2, step: 0.001, uniform: 'uCenterY' }),

      // Extended range: -5 (full black collapse) to +2 (extreme bulge)
      param({ id: 'amount',  name: 'Amount',   value: 0.5, defaultValue: 0.5, min: -5, max: 2, step: 0.001, uniform: 'uAmount' }),

      // Now works for BOTH bulge and suck-in modes
      param({ id: 'radius',  name: 'Radius',   value: 1.0, defaultValue: 1.0, min: 0.05, max: 3, step: 0.01, uniform: 'uRadius' }),
      param({ id: 'softness', name: 'Softness', value: 0.7, defaultValue: 0.7, min: 0.01, max: 1, step: 0.01, uniform: 'uSoftness' }),

      // The main mode selector
      param({ id: 'suckMode', name: 'Suck Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Wide-Angle FOV (Straight)', value: 0 },   // Minecraft FOV / fisheye pull
          { label: 'Spiral Whirlpool',          value: 1 },   // spiraling suck
          { label: 'Uniform Compression',       value: 2 },   // whole layer scales down uniformly
        ], uniform: 'uSuckMode' }),

      param({ id: 'swirlAmount', name: 'Spiral Amount', value: 1.0, defaultValue: 1.0, min: -6, max: 6, step: 0.05, uniform: 'uSwirl' }),

      // How aggressive the FOV distortion is
      param({ id: 'fovIntensity', name: 'FOV Distortion', value: 1.0, defaultValue: 1.0, min: 0, max: 3, step: 0.05, uniform: 'uFovIntensity' }),

      param({ id: 'chroma',  name: 'Chromatic Ab', value: 0.0, defaultValue: 0.0, min: 0, max: 2, step: 0.01, uniform: 'uChroma' }),
      param({ id: 'circular', name: 'Circular Shape', type: 'boolean', value: true, defaultValue: true, uniform: 'uCircular' }),
    ],
  ),
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform vec2  uResolution;
    uniform float uCenterX;
    uniform float uCenterY;
    uniform float uAmount;
    uniform float uRadius;
    uniform float uSoftness;
    uniform float uSuckMode;
    uniform float uSwirl;
    uniform float uFovIntensity;
    uniform float uChroma;
    uniform float uCircular;
    varying vec2 vUv;

    vec4 safeSample(vec2 uv) {
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4(0.0);
      }
      return texture2D(uTexture, uv);
    }

    void main() {
      vec2 center = vec2(uCenterX, uCenterY);
      float aspect = uResolution.x / uResolution.y;

      vec2 p = vUv - center;
      if (uCircular > 0.5) p.x *= aspect;

      float dist = length(p);

      // Falloff mask - affected zone controlled by uRadius + uSoftness
      float edge0 = uRadius * (1.0 - uSoftness);
      float mask  = 1.0 - smoothstep(edge0, uRadius, dist);
      float nd    = clamp(dist / max(uRadius, 1e-5), 0.0, 1.0);

      vec2 warpedP = p;
      float darkAmount = 0.0;

      if (uAmount >= 0.0) {
        // ============ BULGE (positive) ============
        float displace = sin(nd * 3.14159) * uAmount * 0.5;
        float scale = 1.0 - displace * mask;
        warpedP = p * scale;

      } else {
        // ============ SUCK-IN (negative) ============
        // Remap amount: 0 to -5. First 0..-2 is smooth warp. -2..-5 progressively darkens.
        float rawSuck = -uAmount;                       // 0..5
        float warpSuck = clamp(rawSuck, 0.0, 2.0) / 2.0; // 0..1 warping strength
        float darkStart = smoothstep(2.0, 5.0, rawSuck); // 0..1 darkness kick-in (only past -2)

        int mode = int(uSuckMode + 0.5);

        if (mode == 0) {
          // ---- WIDE-ANGLE FOV / MINECRAFT-STYLE SUCK ----
          // The classic FOV distortion: as FOV increases, angles bend so
          // stuff at the edges pushes outward AND appears to zoom toward you.
          // Reverse this: pixels near center stay put, pixels near edge
          // get pulled INWARD toward center, exaggerating perspective.
          //
          // Formula: barrel/pincushion distortion with negative K1.
          // r_new = r * (1 + K * r^2)   where K < 0 pulls inward
          float k = -warpSuck * uFovIntensity * 2.0 * mask;
          // Add secondary term for stronger effect at large radii
          float r2 = dist * dist;
          float r4 = r2 * r2;
          float distFactor = 1.0 + k * r2 + k * r4 * 0.3;
          warpedP = p * distFactor;

        } else if (mode == 1) {
          // ---- SPIRAL WHIRLPOOL ----
          float s = pow(warpSuck, 1.0 / 1.5);
          float scale = 1.0 / max(1.0 - s * 0.98 * mask, 0.02);
          warpedP = p * scale;

          float distFactor = 1.0 / (1.0 + dist * 3.0);
          float swirlAmount = uSwirl * warpSuck * distFactor * mask * 6.28318;
          float cs = cos(swirlAmount);
          float sn = sin(swirlAmount);
          warpedP = mat2(cs, -sn, sn, cs) * warpedP;

        } else {
          // ---- UNIFORM COMPRESSION ----
          // Entire layer scales uniformly toward the center point
          float s = pow(warpSuck, 1.0 / 1.5);
          float scale = 1.0 / max(1.0 - s * 0.98, 0.02);
          warpedP = p * scale;
        }

        // Darkness only kicks in past -2 amount, smooth ramp
        darkAmount = darkStart;
      }

      if (uCircular > 0.5) warpedP.x /= aspect;
      vec2 sampleUv = warpedP + center;

      vec4 col;
      if (uChroma > 0.001) {
        vec2 dir = length(p) > 1e-5 ? normalize(p) : vec2(0.0);
        if (uCircular > 0.5) dir.x /= aspect;
        float ca = uChroma * 0.008 * abs(uAmount) * 0.5;
        float r = safeSample(sampleUv + dir * ca).r;
        float g = safeSample(sampleUv                 ).g;
        float b = safeSample(sampleUv - dir * ca).b;
        float a = safeSample(sampleUv                 ).a;
        col = vec4(r, g, b, a);
      } else {
        col = safeSample(sampleUv);
      }

      col.rgb *= (1.0 - clamp(darkAmount, 0.0, 1.0));

      gl_FragColor = col;
    }`,
};