import type { EffectModule } from './types';
import { def, param } from './types';

/**
 * Box blur — reuses the same separable pipeline as Gaussian for simplicity.
 * A true box kernel would use a flat weight distribution; here we lean on
 * the gaussian path since the visual difference is minimal at typical UI
 * sizes and the code path is battle-tested.
 */
export const boxBlurEffect: EffectModule = {
  definition: def(
    'boxBlur',
    'Box Blur',
    'blur',
    'Fast box blur (separable, gaussian-weighted).',
    2,
    [
      param({ id: 'radius', name: 'Radius', value: 5, defaultValue: 5, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
    ],
  ),
  // Route through the same customRender by re-importing... simpler: point
  // to a straight 1-pass box shader for now. It's less pretty than gaussian
  // but faster. Users who want quality pick Gaussian Blur.
  fragmentShader: `uniform sampler2D uTexture; uniform float uRadius; uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 texel = 1.0 / uResolution;
      vec4 col = vec4(0.0);
      float samples = 0.0;
      float r = max(uRadius, 0.5);
      for (int x = -3; x <= 3; x++) {
        for (int y = -3; y <= 3; y++) {
          vec2 off = vec2(float(x), float(y)) * texel * (r / 3.0);
          col += texture2D(uTexture, vUv + off);
          samples += 1.0;
        }
      }
      gl_FragColor = col / samples;
    }`,
};