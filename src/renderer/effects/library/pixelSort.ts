import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uThreshold;uniform float uLength;uniform float uAngle;uniform float uBlend;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad))/400.0;float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float sort=step(uThreshold,lum);vec3 accum=vec3(0.0);float n=0.0;int steps=int(uLength*20.0);for(int i=0;i<50;i++){if(i>steps)break;float fi=float(i);vec2 uv=clamp(vUv+dir*fi*sort,0.0,1.0);accum+=texture2D(uTexture,uv).rgb;n+=1.0;}vec3 sorted=accum/max(n,1.0);vec3 result=mix(c.rgb,sorted,uBlend);gl_FragColor=vec4(result,c.a);}`;
export const pixelSortEffect:EffectModule={definition:def('pixelSort','Pixel Sort','stylize','Directional pixel sorting glitch effect.',1,[
param({id:'threshold',name:'Threshold',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uThreshold'}),
param({id:'length',name:'Length',value:1,defaultValue:1,min:0.1,max:3,step:0.1,uniform:'uLength'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'blend',name:'Blend',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
