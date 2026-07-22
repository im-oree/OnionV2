import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uAmount;
uniform float uAngle;
uniform vec2 uCenter;
uniform float uFrequency;
uniform float uPhase;
varying vec2 vUv;

void main() {
  vec2 dir = vUv - uCenter;
  float dist = length(dir);
  float a = atan(dir.y, dir.x);

  float wave = sin(dist * uFrequency * 6.2832 + uPhase) * uAmount;

  vec2 warpR = dir * (1.0 + wave * 1.2) + uCenter;
  vec2 warpG = dir * (1.0 + wave * 1.0) + uCenter;
  vec2 warpB = dir * (1.0 + wave * 0.8) + uCenter;

  vec4 c;
  c.r = texture2D(uTexture, clamp(warpR, 0.0, 1.0)).r;
  c.g = texture2D(uTexture, clamp(warpG, 0.0, 1.0)).g;
  c.b = texture2D(uTexture, clamp(warpB, 0.0, 1.0)).b;
  c.a = texture2D(uTexture, vUv).a;

  gl_FragColor = c;
}
`;

export const distortChromaEffect: EffectModule = {
  definition: def('distortChroma','Distort Chroma','distort','Chromatic distortion with per-channel displacement',1,[
    param({id:'amount',name:'Amount',value:0.02,defaultValue:0.02,min:0,max:0.1,step:0.001,uniform:'uAmount'}),
    param({id:'angle',name:'Angle',value:0,defaultValue:0,min:0,max:6.2832,step:0.01,uniform:'uAngle'}),
    param({id:'centerx',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uCenter.x'}),
    param({id:'centery',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uCenter.y'}),
    param({id:'frequency',name:'Frequency',value:2.0,defaultValue:2.0,min:0.5,max:10,step:0.1,uniform:'uFrequency'}),
    param({id:'phase',name:'Phase',value:0.0,defaultValue:0.0,min:0,max:6.2832,step:0.01,uniform:'uPhase'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
