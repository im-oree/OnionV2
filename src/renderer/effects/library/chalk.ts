import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uIntensity;uniform float uRoughness;uniform float uBrightness;uniform vec2 uResolution;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=floor(vUv*uResolution*0.1);vec2 rv=fract(vUv*uResolution*0.1);float grain=mix(-1.0,1.0,hash(uv));float texture=abs(rv.x-0.5)+abs(rv.y-0.5);float chalk=mix(0.0,1.0,smoothstep(0.3,0.8,texture+grain*0.3))*uIntensity;vec3 result=mix(c.rgb,vec3(uBrightness),chalk*0.5);gl_FragColor=vec4(result,c.a);}`;
export const chalkEffect:EffectModule={definition:def('chalk','Chalk','stylize','Chalk/charcoal textured rendering effect.',1,[
param({id:'intensity',name:'Intensity',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uIntensity'}),
param({id:'roughness',name:'Roughness',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uRoughness'}),
param({id:'brightness',name:'Brightness',value:1.2,defaultValue:1.2,min:0,max:3,step:0.1,uniform:'uBrightness'}),
]),fragmentShader:FRAG,};
