import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uMin;uniform float uMax;uniform float uChromaAnomaly;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 yuv;yuv.r=dot(c.rgb,vec3(0.299,0.587,0.114));yuv.g=dot(c.rgb,vec3(-0.147,-0.289,0.436));yuv.b=dot(c.rgb,vec3(0.615,-0.515,-0.100));yuv.r=clamp(yuv.r,uMin,uMax);yuv.g*=1.0-uChromaAnomaly*0.5;yuv.b*=1.0-uChromaAnomaly*0.5;mat3 yuv2rgb=mat3(1.0,1.0,1.0,0.0,-0.395,2.032,1.140,-0.581,0.0);vec3 result=yuv2rgb*yuv;gl_FragColor=vec4(clamp(result,0.0,1.0),c.a);}`;
export const broadcastSafeEffect:EffectModule={definition:def('broadcastSafe','Broadcast Safe','color','Clamp luminance to broadcast-legal range with chroma suppression.',1,[
param({id:'min',name:'Minimum',value:0.07,defaultValue:0.07,min:0,max:0.5,step:0.01,uniform:'uMin'}),
param({id:'max',name:'Maximum',value:0.93,defaultValue:0.93,min:0.5,max:1,step:0.01,uniform:'uMax'}),
param({id:'chromaAnomaly',name:'Chroma Suppress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uChromaAnomaly'}),
]),fragmentShader:FRAG,};
