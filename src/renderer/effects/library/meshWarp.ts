import type { EffectModule } from './types';
import { def, param } from './types';

const MESH_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTLX;
uniform float uTLY;
uniform float uTRX;
uniform float uTRY;
uniform float uBRX;
uniform float uBRY;
uniform float uBLX;
uniform float uBLY;
uniform float uGridSize;
varying vec2 vUv;

vec2 bilerp(vec2 a, vec2 b, vec2 c, vec2 d, vec2 t) {
  vec2 ab = mix(a, b, t.x);
  vec2 dc = mix(d, c, t.x);
  return mix(ab, dc, t.y);
}

void main() {
  vec2 srcTL = vec2(0.0, 0.0);
  vec2 srcTR = vec2(1.0, 0.0);
  vec2 srcBR = vec2(1.0, 1.0);
  vec2 srcBL = vec2(0.0, 1.0);
  
  vec2 uTL = vec2(uTLX, uTLY);
  vec2 uTR = vec2(uTRX, uTRY);
  vec2 uBR = vec2(uBRX, uBRY);
  vec2 uBL = vec2(uBLX, uBLY);
  
  float gridN = min(max(uGridSize, 2.0), 16.0);
  float bestDist = 1e10;
  vec2 bestSrc = vUv;
  
  for (float gy = 0.0; gy <= 16.0; gy += 1.0) {
    if (gy > gridN) break;
    for (float gx = 0.0; gx <= 16.0; gx += 1.0) {
      if (gx > gridN) break;
      vec2 t = vec2(gx / gridN, gy / gridN);
      vec2 srcPos = bilerp(srcTL, srcTR, srcBR, srcBL, t);
      vec2 dstPos = bilerp(uTL, uTR, uBR, uBL, t);
      float d = distance(vUv, dstPos);
      if (d < bestDist) {
        bestDist = d;
        bestSrc = srcPos;
      }
    }
  }
  
  bestSrc = clamp(bestSrc, 0.0, 1.0);
  gl_FragColor = texture2D(uTexture, bestSrc);
}`;

export const meshWarpEffect: EffectModule = {
  definition: def('meshWarp', 'Mesh Warp', 'distort',
    'Deform the image by moving the four corner positions. Like Corner Pin with smooth interpolation.',
    1,
    [
      param({ id: 'tlX', name: 'Top Left X', value: 0, defaultValue: 0, min: -0.5, max: 0.5, step: 0.01, uniform: 'uTLX' }),
      param({ id: 'tlY', name: 'Top Left Y', value: 0, defaultValue: 0, min: -0.5, max: 0.5, step: 0.01, uniform: 'uTLY' }),
      param({ id: 'trX', name: 'Top Right X', value: 1, defaultValue: 1, min: 0.5, max: 1.5, step: 0.01, uniform: 'uTRX' }),
      param({ id: 'trY', name: 'Top Right Y', value: 0, defaultValue: 0, min: -0.5, max: 0.5, step: 0.01, uniform: 'uTRY' }),
      param({ id: 'brX', name: 'Bottom Right X', value: 1, defaultValue: 1, min: 0.5, max: 1.5, step: 0.01, uniform: 'uBRX' }),
      param({ id: 'brY', name: 'Bottom Right Y', value: 1, defaultValue: 1, min: 0.5, max: 1.5, step: 0.01, uniform: 'uBRY' }),
      param({ id: 'blX', name: 'Bottom Left X', value: 0, defaultValue: 0, min: -0.5, max: 0.5, step: 0.01, uniform: 'uBLX' }),
      param({ id: 'blY', name: 'Bottom Left Y', value: 1, defaultValue: 1, min: 0.5, max: 1.5, step: 0.01, uniform: 'uBLY' }),
      param({ id: 'gridSize', name: 'Grid Resolution', value: 8, defaultValue: 8, min: 2, max: 32, step: 1, uniform: 'uGridSize' }),
    ]),
  fragmentShader: MESH_FRAG,
};
