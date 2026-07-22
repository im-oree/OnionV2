import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSize;uniform float uAspect;uniform float uBlend;varying vec2 vUv;vec2 hex(vec2 p,float s){vec2 h=vec2(s,s*0.5);vec2 i=floor(p/h);vec2 f=fract(p/h)-0.5;float d=dot(f,f);vec2 c=vec2(0.0);float md=1e6;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 off=vec2(float(x),float(y));vec2 n=i+off;vec2 q=vec2(0.0);q.x=mod(n.x,2.0)*h.x*0.5;vec2 fp=f-off;float dd=dot(fp,fp);if(dd<md){md=dd;c=n;}}}return(c+vec2(0.5))*h;}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=hex(vUv/uSize,1.0)*uSize;uv=clamp(uv,0.0,1.0);vec4 hexCol=texture2D(uTexture,uv);gl_FragColor=mix(c,hexCol,uBlend);}`;
export const flysEyesHexEffect:EffectModule={definition:def('flysEyesHex','Fly\'s Eyes Hex','stylize','Fly\'s eye hexagonal lens effect.',1,[
param({id:'size',name:'Size',value:0.05,defaultValue:0.05,min:0.01,max:0.3,step:0.005,uniform:'uSize'}),
param({id:'aspect',name:'Aspect',value:1,defaultValue:1,min:0.5,max:2,step:0.1,uniform:'uAspect'}),
param({id:'blend',name:'Blend',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
