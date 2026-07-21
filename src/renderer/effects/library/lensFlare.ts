import type { EffectModule } from './types';
import { def, param } from './types';

const FLARE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uCenterX;
uniform float uCenterY;
uniform float uIntensity;
uniform float uSize;
uniform float uDispersion;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  
  vec2 center = vec2(uCenterX, uCenterY);
  vec2 delta = vUv - center;
  float dist = length(delta);
  vec2 dir = dist > 0.001 ? delta / dist : vec2(0.0);
  
  // Main glow
  float glow = exp(-dist * dist * uSize * 200.0) * uIntensity;
  
  // Starburst rays
  float angle = atan(delta.y, delta.x);
  float rays = 0.0;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 3.14159265 / 3.0;
    float d = abs(sin(angle - a));
    rays += pow(d, 16.0) * 0.15;
  }
  rays *= exp(-dist * 3.0) * uIntensity;
  
  // Chromatic ghost elements (along the flare line, mirrored)
  vec3 ghosts = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float gDist = 0.5 * float(i + 1) * 0.25;
    vec2 gUV = center - dir * gDist;
    float g = exp(-length(gUV - 0.5) * 8.0) * uIntensity * 0.3;
    float rShift = g * (1.0 + uDispersion * 0.1 * float(i));
    float bShift = g * (1.0 - uDispersion * 0.1 * float(i));
    ghosts.r += rShift * 0.8;
    ghosts.g += g * 0.9;
    ghosts.b += bShift * 1.0;
  }
  
  // Ring element
  float ringDist = abs(dist - 0.15);
  float ring = exp(-ringDist * ringDist * 800.0) * 0.3 * uIntensity;
  
  vec3 flareColor = vec3(glow + rays + ring) + ghosts;
  vec3 result = src.rgb + flareColor;
  
  gl_FragColor = vec4(result, max(src.a, glow));
}`;

export const lensFlareEffect: EffectModule = {
  definition: def('lensFlare', 'Lens Flare', 'generate',
    'Cinematic lens flare with glow, rays, ghost elements, and chromatic dispersion.', 1,
    [
      param({ id: 'posX', name: 'Position X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
      param({ id: 'posY', name: 'Position Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
      param({ id: 'intensity', name: 'Intensity', value: 1.0, defaultValue: 1.0, min: 0, max: 5, step: 0.1, uniform: 'uIntensity' }),
      param({ id: 'size', name: 'Size', value: 1.0, defaultValue: 1.0, min: 0.1, max: 5, step: 0.1, uniform: 'uSize' }),
      param({ id: 'dispersion', name: 'Chromatic Dispersion', value: 1.0, defaultValue: 1.0, min: 0, max: 3, step: 0.1, uniform: 'uDispersion' }),
    ]),
  fragmentShader: FLARE_FRAG,
};
