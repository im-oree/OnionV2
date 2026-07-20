import type { EffectModule } from './types';
import { def, param } from './types';

export const edgeDetectEffect: EffectModule = {
  definition: def('edgeDetect', 'Edge Detect', 'stylize', 'Isolates edges using Sobel operator.', 1, [
    param({ id: 'thickness', name: 'Thickness', value: 1.0, min: 0.5, max: 5, step: 0.1, uniform: 'uThickness' }),
    param({ id: 'invert', name: 'Invert', type: 'boolean', value: false, defaultValue: false, uniform: 'uInvert' }),
    param({ id: 'color', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uThickness;
    uniform bool uInvert;
    uniform vec3 uColor;
    uniform vec2 uResolution;
    varying vec2 vUv;
    float lum(vec2 uv) {
      vec3 c = texture2D(uTexture, uv).rgb;
      return dot(c, vec3(0.299, 0.587, 0.114));
    }
    void main() {
      vec2 px = uThickness / uResolution;
      float gx = -lum(vUv+vec2(-px.x,-px.y)) + lum(vUv+vec2(px.x,-px.y))
                 -2.0*lum(vUv+vec2(-px.x,0.)) + 2.0*lum(vUv+vec2(px.x,0.))
                 -lum(vUv+vec2(-px.x,px.y)) + lum(vUv+vec2(px.x,px.y));
      float gy = -lum(vUv+vec2(-px.x,-px.y)) - 2.0*lum(vUv+vec2(0.,-px.y))
                 -lum(vUv+vec2(px.x,-px.y)) + lum(vUv+vec2(-px.x,px.y))
                 +2.0*lum(vUv+vec2(0.,px.y)) + lum(vUv+vec2(px.x,px.y));
      float edge = clamp(sqrt(gx*gx+gy*gy)*3.0, 0.0, 1.0);
      if (uInvert) edge = 1.0 - edge;
      gl_FragColor = vec4(uColor * edge, edge);
    }`,
};
