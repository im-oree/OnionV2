import type { EffectModule } from './types';
import { def, param } from './types';

export const ccSphereEffect: EffectModule = {
  definition: def('ccSphere', 'CC Sphere', 'distort',
    'Wraps the layer onto a rotating 3-D sphere.', 1, [
    param({ id: 'rotationY', name: 'Rotate Y',  type: 'angle', value: 0,   min: -720, max: 720, step: 1, uniform: 'uRotY' }),
    param({ id: 'rotationX', name: 'Rotate X',  type: 'angle', value: 0,   min: -180, max: 180, step: 1, uniform: 'uRotX' }),
    param({ id: 'radius',    name: 'Radius',    value: 0.45, min: 0.1, max: 0.5, step: 0.01, uniform: 'uRadius' }),
    param({ id: 'light',     name: 'Light',     value: 0.3,  min: 0,   max: 1,   step: 0.01, uniform: 'uLight' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uRotY;
    uniform float uRotX;
    uniform float uRadius;
    uniform float uLight;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv - 0.5;
      float r2 = dot(uv, uv);
      if (r2 > uRadius * uRadius) { gl_FragColor = vec4(0.0); return; }
      float z = sqrt(uRadius * uRadius - r2);
      vec3  p = vec3(uv.x, uv.y, z);
      float ay = radians(uRotY);
      p = vec3(cos(ay)*p.x + sin(ay)*p.z, p.y, -sin(ay)*p.x + cos(ay)*p.z);
      float ax = radians(uRotX);
      p = vec3(p.x, cos(ax)*p.y - sin(ax)*p.z, sin(ax)*p.y + cos(ax)*p.z);
      float u = 0.5 + atan(p.x, p.z) / 6.28318;
      float v = 0.5 - asin(p.y / uRadius) / 3.14159;
      vec4 col = texture2D(uTexture, vec2(u, v));
      float shade = mix(1.0, z / uRadius, uLight);
      gl_FragColor = vec4(col.rgb * shade, col.a);
    }`,
};
