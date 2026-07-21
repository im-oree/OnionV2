import type { EffectModule } from './types';
import { def, param } from './types';

const IRIS_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uProgress;
uniform float uFeather;
uniform int uShape;
uniform float uRotation;
varying vec2 vUv;

float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdDiamond(vec2 p, float r) { p = abs(p); return (p.x + p.y - r) / 1.414; }
float sdSquare(vec2 p, float r) { p = abs(p); return max(p.x, p.y) - r; }

float sdStar(vec2 p, float r, int n, float m) {
  float an = 3.141593 / float(n);
  float en = 3.141593 / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 delta = vUv - uCenter;
  float aspect = uResolution.x / uResolution.y;
  delta.x *= aspect;
  float rad = uRotation * 3.14159265 / 180.0;
  float cs = cos(rad), sn = sin(rad);
  vec2 rp = vec2(delta.x * cs - delta.y * sn, delta.x * sn + delta.y * cs);
  float maxR = 1.2 * uProgress;
  float sd;
  if (uShape == 0) sd = sdCircle(rp, maxR);
  else if (uShape == 1) sd = sdDiamond(rp, maxR);
  else if (uShape == 2) sd = sdSquare(rp, maxR);
  else sd = sdStar(rp, maxR * 0.8, 5, 2.5);
  float mask = smoothstep(-uFeather * 0.05, uFeather * 0.05, sd);
  float alpha = src.a * (1.0 - mask);
  gl_FragColor = vec4(src.rgb * (1.0 - mask), alpha);
}`;

export const irisRevealEffect: EffectModule = {
  definition: def('irisReveal', 'Iris Reveal', 'transition',
    'Shape-based wipe (circle, diamond, square, star) that reveals content. Keyframe Progress.',
    1,
    [
      param({ id: 'progress', name: 'Progress', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uProgress' }),
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
      param({ id: 'feather', name: 'Feather', value: 0.5, defaultValue: 0.5, min: 0, max: 3, step: 0.01, uniform: 'uFeather' }),
      param({ id: 'shape', name: 'Shape', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Circle', value: 0 },
          { label: 'Diamond', value: 1 },
          { label: 'Square', value: 2 },
          { label: 'Star', value: 3 },
        ], uniform: 'uShape' }),
      param({ id: 'rotation', name: 'Rotation', value: 0, defaultValue: 0, min: 0, max: 360, step: 1, uniform: 'uRotation' }),
    ]),
  fragmentShader: IRIS_FRAG,
  usesTime: true,
};
