import type { EffectModule } from './types';
import { def, param } from './types';

const MOSAIC_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uBlocks;
uniform float uSharpness;
varying vec2 vUv;

void main() {
  vec2 block = vec2(uBlocks, uBlocks * uResolution.y / uResolution.x);
  vec2 uv = floor(vUv * block) / block;
  
  if (uSharpness > 0.0) {
    // Sharp edges: just sample at block center
    gl_FragColor = texture2D(uTexture, uv + 0.5 / block);
  } else {
    // Soft: blend between original and mosaic
    vec4 orig = texture2D(uTexture, vUv);
    vec4 mosaic = texture2D(uTexture, uv + 0.5 / block);
    gl_FragColor = mix(orig, mosaic, 0.8);
  }
}`;

export const mosaicEffect: EffectModule = {
  definition: def('mosaic', 'Mosaic', 'stylize',
    'Pixelates the image into a grid of blocks.', 1,
    [
      param({ id: 'blocks', name: 'Horizontal Blocks', value: 40, defaultValue: 40, min: 1, max: 200, step: 1, uniform: 'uBlocks' }),
      param({ id: 'sharpness', name: 'Sharpness', type: 'boolean', value: true, defaultValue: true, uniform: 'uSharpness' }),
    ]),
  fragmentShader: MOSAIC_FRAG,
};
