import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSize;uniform float uBlend;varying vec2 vUv;vec2 hex(vec2 p,float s){vec2 h=vec2(s,s*0.866);vec2 i=floor(p/h);vec2 f=fract(p/h)-0.5;float d=length(f);vec2 n=mix(i,i+vec2(1,0)*step(0.0,f.x),step(d,length(f-vec2(sign(f.x),0.0)*0.5)));return(n+vec2(0.5))*h-s*0.5;}void main(){vec4 c=texture2D(uTexture,vUv);vec2 h=hex(vUv,max(uSize*0.01,0.001));vec4 hexCol=texture2D(uTexture,clamp(h,0.0,1.0));gl_FragColor=mix(c,hexCol,uBlend);}`;
export const ccHexagonEffect:EffectModule={definition:def('ccHexagon','CC Hexagon','stylize','Hexagonal pixelation/stylization effect.',1,[
param({id:'size',name:'Size',value:20,defaultValue:20,min:1,max:100,step:1,uniform:'uSize'}),
param({id:'blend',name:'Blend',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
