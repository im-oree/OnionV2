import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uIntensity;
uniform vec2 uPosition;
uniform float uSize;
uniform float uSpread;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);
  vec2 dir = vUv - uPosition;
  float dist = length(dir);
  float vignette = 1.0 - smoothstep(uSpread, uSpread + uSize, dist);
  float glow = exp(-dist * dist * 4.0 / (uSize * uSize)) * uIntensity;
  vec3 glowCol = vec3(1.0, 0.95, 0.8) * glow;
  gl_FragColor = vec4(c.rgb + glowCol, c.a);
}
`;

export const eyeLightEffect: EffectModule = {
  definition: def('eyeLight','Eye Light','generate','Adds a soft catchlight highlight on eyes/faces',1,[
    param({id:'intensity',name:'Intensity',value:0.5,defaultValue:0.5,min:0,max:2,step:0.01,uniform:'uIntensity'}),
    param({id:'positionx',name:'Position X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uPosition.x'}),
    param({id:'positiony',name:'Position Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uPosition.y'}),
    param({id:'size',name:'Size',value:0.15,defaultValue:0.15,min:0.02,max:0.5,step:0.01,uniform:'uSize'}),
    param({id:'spread',name:'Spread',value:0.2,defaultValue:0.2,min:0,max:0.5,step:0.01,uniform:'uSpread'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
