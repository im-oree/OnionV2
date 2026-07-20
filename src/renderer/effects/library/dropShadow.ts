import type { EffectModule } from './types';
import { def, param } from './types';

export const dropShadowEffect: EffectModule = {
  definition: def(
    'dropShadow',
    'Drop Shadow',
    'stylize',
    'Soft drop shadow behind layer.',
    1,
    [
      param({ id: 'color', name: 'Color', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColor' }),
      param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 75, defaultValue: 75, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
      param({ id: 'distance', name: 'Distance', value: 10, defaultValue: 10, min: 0, max: 500, step: 1, uniform: 'uDistance' }),
      param({ id: 'angle', name: 'Angle', type: 'angle', value: 135, defaultValue: 135, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
      param({ id: 'softness', name: 'Softness', value: 10, defaultValue: 10, min: 0, max: 100, step: 1, uniform: 'uSoftness' }),
    ],
  ),
  fragmentShader: `uniform sampler2D uTexture; uniform vec3 uColor; uniform float uOpacity;
    uniform float uDistance; uniform float uAngle; uniform float uSoftness; uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      float a = radians(uAngle);
      vec2 dir = vec2(cos(a), -sin(a)) * uDistance / uResolution;
      vec2 blurOff = (1.0 / uResolution) * uSoftness;
      vec4 shadow = vec4(0.0);
      float total = 0.0;
      for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) {
        shadow += texture2D(uTexture, vUv - dir + vec2(float(x), float(y)) * blurOff);
        total += 1.0;
      }
      shadow /= total;
      float shadowAlpha = shadow.a * (uOpacity / 100.0);
      vec3 rgb = mix(uColor * shadowAlpha, src.rgb, src.a);
      float outA = max(src.a, shadowAlpha);
      gl_FragColor = vec4(rgb, outA);
    }`,
};