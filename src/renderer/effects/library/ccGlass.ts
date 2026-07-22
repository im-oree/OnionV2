import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uDistortion;uniform float uScale;uniform float uBrightness;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 dir=vUv-uCenter;float dist=length(dir);float bulge=exp(-dist*dist*uScale)*uDistortion*0.1;vec2 uv=vUv+dir*bulge;vec4 refr=texture2D(uTexture,clamp(uv,0.0,1.0));vec3 result=mix(c.rgb,refr.rgb,0.7)*uBrightness;gl_FragColor=vec4(result,c.a);}`;
export const ccGlassEffect:EffectModule={definition:def('ccGlass','CC Glass','stylize','Glass refraction/ripple effect.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'distortion',name:'Distortion',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uDistortion'}),
param({id:'scale',name:'Scale',value:10,defaultValue:10,min:1,max:100,step:1,uniform:'uScale'}),
param({id:'brightness',name:'Brightness',value:1.2,defaultValue:1.2,min:0,max:3,step:0.1,uniform:'uBrightness'}),
]),fragmentShader:FRAG,};
