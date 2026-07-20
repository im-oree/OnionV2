import type { EffectModule } from './types';
import { def, param } from './types';

export const radialWipeEffect: EffectModule = {
  definition: def('radialWipe', 'Radial Wipe', 'transition', 'Clock-wipe reveal/conceal transition.', 1, [
    param({ id: 'progress', name: 'Progress', value: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uProgress' }),
    param({ id: 'startAngle', name: 'Start Angle', type: 'angle', value: -90, min: -360, max: 360, step: 1, uniform: 'uStartAngle' }),
    param({ id: 'softness', name: 'Softness', value: 0.02, min: 0, max: 0.2, step: 0.001, uniform: 'uSoftness' }),
    param({ id: 'clockwise', name: 'Clockwise', type: 'boolean', value: true, defaultValue: true, uniform: 'uClockwise' }),
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5] as [number, number], defaultValue: [0.5, 0.5] as [number, number], step: 0.01, uniform: 'uCenter' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uProgress;
    uniform float uStartAngle;
    uniform float uSoftness;
    uniform bool uClockwise;
    uniform vec2 uCenter;
    varying vec2 vUv;
    #define TAU 6.28318530
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 dir = vUv - uCenter;
      float angle = atan(dir.y, dir.x) - radians(uStartAngle);
      if (uClockwise) angle = -angle;
      angle = mod(angle, TAU) / TAU;
      float alpha = smoothstep(uProgress - uSoftness, uProgress + uSoftness, angle);
      gl_FragColor = vec4(src.rgb, src.a * alpha);
    }`,
};
