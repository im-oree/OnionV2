import type { EffectModule } from './types';
import { def, param } from './types';

const CUTOUT_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uThreshold;
uniform float uFeather;
uniform float uInvert;
varying vec2 vUv;

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  vec2 texel = 1.0 / uResolution;
  float tl = luminance(texture2D(uTexture, vUv + vec2(-texel.x, -texel.y)).rgb);
  float t  = luminance(texture2D(uTexture, vUv + vec2(0, -texel.y)).rgb);
  float tr = luminance(texture2D(uTexture, vUv + vec2(texel.x, -texel.y)).rgb);
  float l  = luminance(texture2D(uTexture, vUv + vec2(-texel.x, 0)).rgb);
  float r  = luminance(texture2D(uTexture, vUv + vec2(texel.x, 0)).rgb);
  float bl = luminance(texture2D(uTexture, vUv + vec2(-texel.x, texel.y)).rgb);
  float b  = luminance(texture2D(uTexture, vUv + vec2(0, texel.y)).rgb);
  float br = luminance(texture2D(uTexture, vUv + vec2(texel.x, texel.y)).rgb);
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy);
  float edgeMask = smoothstep(uThreshold * 0.5, uThreshold, edge);
  float interior = (1.0 - edgeMask) * step(0.1, src.a);
  float mask = 1.0 - interior;
  mask = smoothstep(0.0, uFeather, mask);
  if (uInvert > 0.5) mask = 1.0 - mask;
  float alpha = src.a * (1.0 - mask);
  gl_FragColor = vec4(src.rgb * (1.0 - mask), alpha);
}`;

export const autoCutoutEffect: EffectModule = {
  definition: def('autoCutout', 'Auto Cutout', 'keying',
    'Edge-detection based background removal. Best for subjects with clear edges against simple backgrounds.',
    1,
    [
      param({ id: 'threshold', name: 'Edge Threshold', value: 0.15, defaultValue: 0.15, min: 0.01, max: 0.5, step: 0.01, uniform: 'uThreshold' }),
      param({ id: 'feather', name: 'Feather', value: 0.5, defaultValue: 0.5, min: 0, max: 5, step: 0.1, uniform: 'uFeather' }),
      param({ id: 'invert', name: 'Invert', type: 'boolean', value: false, defaultValue: false, uniform: 'uInvert' }),
    ]),
  fragmentShader: CUTOUT_FRAG,
};
