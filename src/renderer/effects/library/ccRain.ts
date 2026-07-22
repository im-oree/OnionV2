import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uDensity;uniform float uSpeed;uniform float uAngle;uniform float uLength;uniform float uOpacity;uniform float uTime;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 wind=vec2(sin(rad),cos(rad))*uSpeed*uTime;vec2 uv=vUv*vec2(1.0,uDensity*50.0)+wind;vec2 id=floor(uv);vec2 fv=fract(uv);float r=hash(id);float drop=smoothstep(0.7,1.0,r)*uDensity;float trail=1.0-smoothstep(0.0,uLength,fv.y);float alpha=drop*trail*uOpacity;vec3 rainCol=mix(c.rgb,vec3(0.8,0.85,1.0),alpha*0.3);gl_FragColor=vec4(mix(c.rgb,rainCol,alpha),c.a);}`;
export const ccRainEffect:EffectModule={definition:def('ccRain','CC Rain','generate','Rainfall simulation with wind control.',1,[
param({id:'density',name:'Density',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uDensity'}),
param({id:'speed',name:'Speed',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uSpeed'}),
param({id:'angle',name:'Angle',value:-15,defaultValue:-15,min:-90,max:90,step:1,uniform:'uAngle'}),
param({id:'length',name:'Length',value:0.3,defaultValue:0.3,min:0.05,max:1,step:0.01,uniform:'uLength'}),
param({id:'opacity',name:'Opacity',value:0.6,defaultValue:0.6,min:0,max:1,step:0.01,uniform:'uOpacity'}),
]),fragmentShader:FRAG,usesTime:true,};
