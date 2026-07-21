import type { EffectModule } from './types';
import { def, param } from './types';

const ROUGHEN_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uEdgeThin;
uniform float uEdgeRough;
uniform float uScale;
varying vec2 vUv;

// Simple hash noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);
  
  // Compute edge distance from alpha
  float alpha = src.a;
  
  // Displace UV based on noise at the edge
  float n = noise(vUv * uScale * 50.0) * 2.0 - 1.0;
  float edgeFactor = smoothstep(0.0, uEdgeThin + 0.1, alpha);
  
  // Roughen the edge by displacing alpha
  float roughAlpha = alpha + n * uEdgeRough * (1.0 - edgeFactor) * 0.3;
  roughAlpha = clamp(roughAlpha, 0.0, 1.0);
  
  gl_FragColor = vec4(src.rgb, roughAlpha);
}`;

export const roughenEdgesEffect: EffectModule = {
  definition: def('roughenEdges', 'Roughen Edges', 'stylize',
    'Adds organic, irregular edges to the alpha channel.', 1,
    [
      param({ id: 'edgeThin', name: 'Edge Thin', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uEdgeThin' }),
      param({ id: 'edgeRough', name: 'Edge Roughness', value: 0.5, defaultValue: 0.5, min: 0, max: 2, step: 0.01, uniform: 'uEdgeRough' }),
      param({ id: 'scale', name: 'Scale', value: 1.0, defaultValue: 1.0, min: 0.1, max: 5, step: 0.1, uniform: 'uScale' }),
    ]),
  fragmentShader: ROUGHEN_FRAG,
};
