import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uThresholdR;uniform float uThresholdG;uniform float uThresholdB;uniform float uSoftness;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 t=vec3(uThresholdR,uThresholdG,uThresholdB);vec3 s=max(vec3(uSoftness),0.001);vec3 m=smoothstep(t-s*0.5,t+s*0.5,c.rgb);gl_FragColor=vec4(m,c.a);}`;
export const ccThresholdRGBEffect:EffectModule={definition:def('ccThresholdRGB','CC Threshold RGB','stylize','Per-channel color threshold with softness.',1,[
param({id:'thresholdR',name:'Red Threshold',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uThresholdR'}),
param({id:'thresholdG',name:'Green Threshold',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uThresholdG'}),
param({id:'thresholdB',name:'Blue Threshold',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uThresholdB'}),
param({id:'softness',name:'Softness',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uSoftness'}),
]),fragmentShader:FRAG,};
