import type { EffectModule } from './types';
import { def, param } from './types';

export const radialBlurEffect: EffectModule = {
  definition: def(
    'radialBlur',
    'Radial Blur',
    'blur',
    'Photographic zoom + spin blur with sharp focal center and long streaks.',
    1,
    [
      param({
        id: 'zoomStrength',
        name: 'Zoom Strength',
        value: 0.5,
        defaultValue: 0.5,
        min: 0,
        max: 3,
        step: 0.01,
        uniform: 'uZoom',
      }),
      param({
        id: 'spinStrength',
        name: 'Spin Strength',
        value: 0.0,
        defaultValue: 0.0,
        min: -2,
        max: 2,
        step: 0.01,
        uniform: 'uSpin',
      }),
      param({
        id: 'centerX',
        name: 'Center X',
        value: 0.5,
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.001,
        uniform: 'uCenterX',
      }),
      param({
        id: 'centerY',
        name: 'Center Y',
        value: 0.5,
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.001,
        uniform: 'uCenterY',
      }),
      param({
        id: 'focusRadius',
        name: 'Focus Radius',
        value: 0.15,
        defaultValue: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
        uniform: 'uFocusRadius',
      }),
      param({
        id: 'focusFeather',
        name: 'Focus Feather',
        value: 0.35,
        defaultValue: 0.35,
        min: 0.01,
        max: 1,
        step: 0.01,
        uniform: 'uFocusFeather',
      }),
      param({
        id: 'falloffPower',
        name: 'Edge Falloff',
        value: 1.5,
        defaultValue: 1.5,
        min: 0.1,
        max: 5,
        step: 0.05,
        uniform: 'uFalloff',
      }),
      param({
        id: 'samples',
        name: 'Quality (Samples)',
        value: 40,
        defaultValue: 40,
        min: 4,
        max: 96,
        step: 1,
        uniform: 'uSamples',
      }),
      param({
        id: 'dither',
        name: 'Dither',
        value: 1.0,
        defaultValue: 1.0,
        min: 0,
        max: 1,
        step: 0.01,
        uniform: 'uDither',
      }),
    ],
  ),
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uZoom;
    uniform float uSpin;
    uniform float uCenterX;
    uniform float uCenterY;
    uniform float uFocusRadius;
    uniform float uFocusFeather;
    uniform float uFalloff;
    uniform float uSamples;
    uniform float uDither;
    varying vec2 vUv;

    // Cheap hash for jitter
    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 center = vec2(uCenterX, uCenterY);
      vec2 delta  = vUv - center;
      float dist  = length(delta);

      // --- Focus mask: 0 in the protected center, 1 out at the edges ---
      float focusEnd = uFocusRadius + uFocusFeather;
      float mask = smoothstep(uFocusRadius, focusEnd, dist);
      mask = pow(mask, uFalloff);

      // Early out for the sharp center - big perf win
      if (mask < 0.001) {
        gl_FragColor = texture2D(uTexture, vUv);
        return;
      }

      // Radial direction (unit vector from center outward)
      vec2 radial = dist > 0.00001 ? delta / dist : vec2(0.0);
      // Tangential direction (perpendicular, for spin)
      vec2 tangent = vec2(-radial.y, radial.x);

      // Blur length scales with distance from center (that's what
      // makes streaks longer at the edges - the key to the look)
      float zoomLen = uZoom * dist * mask;
      float spinLen = uSpin * dist * mask;

      int samples = int(clamp(uSamples, 4.0, 96.0));
      float fSamples = float(samples);

      // Random jitter to hide banding
      float jitter = (hash(vUv * 1024.0) - 0.5) * uDither / fSamples;

      vec4 accum = vec4(0.0);
      float total = 0.0;

      for (int i = 0; i < 96; i++) {
        if (i >= samples) break;

        float t = (float(i) + 0.5) / fSamples;      // 0..1
        float offset = (t - 0.5) + jitter;          // -0.5..0.5 (symmetric)

        // Move sample along the radial line (zoom) and tangent (spin)
        vec2 sampleUv = vUv
                      + radial  * (zoomLen * offset)
                      + tangent * (spinLen * offset);

        // Gaussian weight - smoother than box blur
        float w = exp(-offset * offset * 6.0);

        accum += texture2D(uTexture, sampleUv) * w;
        total += w;
      }

      vec4 blurred = accum / total;
      vec4 sharp   = texture2D(uTexture, vUv);

      // Blend sharp center into blurred result using the mask
      gl_FragColor = mix(sharp, blurred, mask);
    }
  `,
};