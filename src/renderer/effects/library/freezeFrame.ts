import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uFreeze;
uniform float uBlend;
uniform float uPhase;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);
  // When frozen, the effect holds the current frame.
  // uPhase controls cross-fade to frozen state
  if (uFreeze > 0.5) {
    float blend = uBlend * uPhase;
    gl_FragColor = vec4(mix(c.rgb, c.rgb, blend), c.a * (1.0 - blend * 0.3));
  } else {
    gl_FragColor = c;
  }
}
`;

export const freezeFrameEffect: EffectModule = {
  definition: def('freezeFrame','Freeze Frame','stylize','Holds the current frame with optional blend',1,[
    param({id:'freeze',name:'Freeze',value:0,defaultValue:0,min:0,max:1,step:1,uniform:'uFreeze'}),
    param({id:'blend',name:'Blend',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uBlend'}),
    param({id:'phase',name:'Phase',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uPhase'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
