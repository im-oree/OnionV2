import type { EffectModule } from './types';
import { def, param } from './types';

export const twirlEffect: EffectModule = {
  definition: def('twirl', 'Twirl', 'distort', 'Rotational distortion around a center point.', 1, [
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5] as [number, number], defaultValue: [0.5, 0.5] as [number, number], step: 0.01, uniform: 'uCenter' }),
    param({ id: 'angle', name: 'Angle', value: 90, min: -360, max: 360, step: 1, uniform: 'uAngle' }),
    param({ id: 'radius', name: 'Radius', value: 0.5, min: 0, max: 2, step: 0.01, uniform: 'uRadius' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec2 uCenter;
    uniform float uAngle;
    uniform float uRadius;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - uCenter;
      float dist = length(dir);
      float falloff = max(0.0, 1.0 - dist / max(uRadius, 0.001));
      float rot = radians(uAngle) * falloff * falloff;
      float c = cos(rot), s = sin(rot);
      vec2 twisted = uCenter + vec2(c * dir.x - s * dir.y, s * dir.x + c * dir.y);
      gl_FragColor = texture2D(uTexture, clamp(twisted, 0.0, 1.0));
    }`,
};
