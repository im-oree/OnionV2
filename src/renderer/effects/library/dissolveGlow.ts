import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uDissolveMap;
uniform float uProgress;
uniform float uGlowWidth;
uniform vec3 uGlowColor;
uniform float uGlowIntensity;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);
  float noise = texture2D(uDissolveMap, vUv).r;

  float mask = smoothstep(uProgress - 0.1, uProgress + 0.1, noise);
  float glow = exp(-abs(noise - uProgress) / max(uGlowWidth, 0.001)) * uGlowIntensity;
  glow *= 1.0 - mask;

  vec3 result = mix(c.rgb, vec3(0.0), mask);
  result += uGlowColor * glow;

  gl_FragColor = vec4(result, c.a * (1.0 - mask));
}
`;

export const dissolveGlowEffect: EffectModule = {
  definition: def('dissolveGlow','Dissolve Glow','transition','Dissolve transition with glow edge',1,[
    param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
    param({id:'glowWidth',name:'Glow Width',value:0.1,defaultValue:0.1,min:0.01,max:0.3,step:0.01,uniform:'uGlowWidth'}),
    param({id:'glowColorr',name:'Glow Color R',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uGlowColor.r'}),
    param({id:'glowColorg',name:'Glow Color G',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uGlowColor.g'}),
    param({id:'glowColorb',name:'Glow Color B',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uGlowColor.b'}),
    param({id:'glowIntensity',name:'Glow Intensity',value:1.5,defaultValue:1.5,min:0,max:3,step:0.01,uniform:'uGlowIntensity'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
