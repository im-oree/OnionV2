import type { EffectModule } from './types';
import { def, param } from './types';

export const badTvEffect: EffectModule = {
  definition: def('badTv', 'Bad TV', 'stylize',
    'VHS-style rolling distortion and static.', 1, [
    param({ id: 'distortion', name: 'Distortion', value: 0.3, min: 0, max: 3, step: 0.01, uniform: 'uDistortion' }),
    param({ id: 'distortion2',name: 'Warp',       value: 0.2, min: 0, max: 3, step: 0.01, uniform: 'uDistortion2' }),
    param({ id: 'speed',      name: 'Speed',      value: 0.3, min: 0, max: 3, step: 0.01, uniform: 'uSpeed' }),
    param({ id: 'rollSpeed',  name: 'Roll Speed', value: 0.1, min: 0, max: 3, step: 0.01, uniform: 'uRollSpeed' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uDistortion;
    uniform float uDistortion2;
    uniform float uSpeed;
    uniform float uRollSpeed;
    uniform float uTime;
    varying vec2 vUv;
    float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 p = vUv;
      float ty = uTime * uSpeed;
      float yt = p.y - ty;
      float offset = sin(yt * 3.0) * uDistortion;
      offset += sin(yt * 50.0) * uDistortion2 * 0.05;
      p.x = fract(p.x + offset);
      p.y = fract(p.y + ty * uRollSpeed);
      vec4 col = texture2D(uTexture, p);
      float n = rand(vec2(floor(vUv.y * 240.0), uTime)) * 0.1;
      gl_FragColor = vec4(col.rgb + n, col.a);
    }`,
};
