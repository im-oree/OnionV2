import type { EffectModule } from './types';
import { def, param } from './types';

export const motionTileEffect: EffectModule = {
  definition: def('motionTile', 'Motion Tile', 'generate', 'Repeats the layer pixels.', 1, [
    param({ id: 'outputWidth', name: 'Width', value: 200, min: 10, max: 1000, uniform: 'uOutputWidth' }),
    param({ id: 'outputHeight', name: 'Height', value: 200, min: 10, max: 1000, uniform: 'uOutputHeight' }),
    param({ id: 'mirror', name: 'Mirror Edges', type: 'boolean', value: true, uniform: 'uMirror' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uOutputWidth;
    uniform float uOutputHeight;
    uniform bool uMirror;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv * vec2(uOutputWidth / 100.0, uOutputHeight / 100.0);
      if (uMirror) {
        vec2 m = mod(floor(uv), 2.0);
        uv = fract(uv);
        if (m.x > 0.5) uv.x = 1.0 - uv.x;
        if (m.y > 0.5) uv.y = 1.0 - uv.y;
      } else {
        uv = fract(uv);
      }
      gl_FragColor = texture2D(uTexture, uv);
    }`,
};
