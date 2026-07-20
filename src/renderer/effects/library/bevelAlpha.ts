import type { EffectModule } from './types';
import { def, param } from './types';

export const bevelAlphaEffect: EffectModule = {
  definition: def('bevelAlpha', 'Bevel Alpha', 'stylize', 'Embossed 3-D edge on layer alpha.', 1, [
    param({ id: 'edgeThickness', name: 'Thickness', value: 4, min: 0, max: 20, step: 0.5, uniform: 'uEdgeThickness' }),
    param({ id: 'lightAngle', name: 'Light Angle', type: 'angle', value: 135, min: 0, max: 360, step: 1, uniform: 'uLightAngle' }),
    param({ id: 'lightColor', name: 'Light Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uLightColor' }),
    param({ id: 'shadowColor', name: 'Shadow Color', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uShadowColor' }),
    param({ id: 'intensity', name: 'Intensity', value: 0.6, min: 0, max: 1, step: 0.01, uniform: 'uIntensity' }),
  ]),
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uEdgeThickness;
    uniform float uLightAngle;
    uniform vec3 uLightColor;
    uniform vec3 uShadowColor;
    uniform float uIntensity;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(uTexture, vUv);
      vec2 px = uEdgeThickness / uResolution;
      float a = radians(uLightAngle);
      vec2 ldir = vec2(cos(a), sin(a));
      float aL = texture2D(uTexture, clamp(vUv - ldir * px, 0.0, 1.0)).a;
      float aR = texture2D(uTexture, clamp(vUv + ldir * px, 0.0, 1.0)).a;
      float diff = aR - aL;
      vec3 bevel = diff > 0.0
        ? mix(src.rgb, uLightColor, diff * uIntensity)
        : mix(src.rgb, uShadowColor, -diff * uIntensity);
      gl_FragColor = vec4(bevel, src.a);
    }`,
};
