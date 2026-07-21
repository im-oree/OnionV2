import type { EffectModule } from './types';
import { def, param } from './types';

const LIGHT_SWEEP_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uAngle;
uniform float uWidth;
uniform float uIntensity;
uniform float uEdgeIntensity;
uniform float uSpeed;
uniform float uProgress;
uniform float uFeather;
uniform float uEdgeSoftness;
uniform float uCenterX;
uniform float uCenterY;
uniform float uSweepColorR;
uniform float uSweepColorG;
uniform float uSweepColorB;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(uTexture, vUv);
  
  // Compose vec2 center and vec3 color from individual float uniforms
  vec2 center = vec2(uCenterX, uCenterY);
  vec3 sweepColor = vec3(uSweepColorR, uSweepColorG, uSweepColorB);
  
  // Compute sweep direction from angle
  float rad = uAngle * 3.14159265 / 180.0;
  vec2 dir = vec2(cos(rad), sin(rad));
  
  // Project UV onto sweep direction, offset by progress (0-1)
  float sweep = dot(vUv - center, dir);
  
  // Animate sweep position: speed drives automatic animation, progress is manual override
  float autoProgress = fract(uTime * uSpeed);
  float finalProgress = uSpeed > 0.001 ? autoProgress : uProgress;
  float offset = (finalProgress - 0.5) * 2.0;
  sweep -= offset;
  
  // Main sweep band with feather control
  float halfW = uWidth * 0.5;
  float feather = max(0.001, uFeather);
  float inner = halfW * (1.0 - feather);
  float band = 1.0 - smoothstep(inner, halfW, abs(sweep));
  
  // Edge highlight with independent softness control
  float edgeHalfW = halfW * (1.0 + uEdgeSoftness * 0.5);
  float edgeInner = halfW * 0.85;
  float edge = 1.0 - smoothstep(edgeInner, edgeHalfW, abs(sweep));
  edge = max(0.0, edge - band * 0.4) * uEdgeIntensity;
  
  // Combine sweep + edge with custom color
  vec3 sweepContrib = sweepColor * band * uIntensity + sweepColor * edge * 0.5;
  vec3 result = src.rgb + sweepContrib;
  
  gl_FragColor = vec4(result, src.a);
}`;

export const ccLightSweepEffect: EffectModule = {
  definition: def('ccLightSweep', 'CC Light Sweep', 'generate',
    'Animated light sweep / glint across the layer. Keyframe Speed to animate, or set Speed=0 and keyframe Progress manually.', 1,
    [
      param({ id: 'speed', name: 'Speed', value: 0.5, defaultValue: 0.5, min: 0, max: 5, step: 0.01, uniform: 'uSpeed' }),
      param({ id: 'angle', name: 'Direction', value: -30, defaultValue: -30, min: -180, max: 180, step: 1, uniform: 'uAngle' }),
      param({ id: 'width', name: 'Width', value: 0.3, defaultValue: 0.3, min: 0.05, max: 1, step: 0.01, uniform: 'uWidth' }),
      param({ id: 'intensity', name: 'Intensity', value: 0.8, defaultValue: 0.8, min: 0, max: 3, step: 0.1, uniform: 'uIntensity' }),
      param({ id: 'edgeIntensity', name: 'Edge Intensity', value: 0.5, defaultValue: 0.5, min: 0, max: 2, step: 0.1, uniform: 'uEdgeIntensity' }),
      param({ id: 'progress', name: 'Progress', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uProgress' }),
      param({ id: 'feather', name: 'Feather', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uFeather' }),
      param({ id: 'edgeSoftness', name: 'Edge Softness', value: 0.2, defaultValue: 0.2, min: 0, max: 1, step: 0.01, uniform: 'uEdgeSoftness' }),
      param({ id: 'centerX', name: 'Center X', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterX' }),
      param({ id: 'centerY', name: 'Center Y', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uCenterY' }),
      param({ id: 'sweepColorR', name: 'Color R', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uSweepColorR' }),
      param({ id: 'sweepColorG', name: 'Color G', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uSweepColorG' }),
      param({ id: 'sweepColorB', name: 'Color B', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uSweepColorB' }),
    ]),
  fragmentShader: LIGHT_SWEEP_FRAG,
  usesTime: true,
};
