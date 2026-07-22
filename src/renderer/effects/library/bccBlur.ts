import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uRadius;uniform float uIntensity;uniform float uAngle;uniform float uAspect;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad))*vec2(uAspect,1.0);vec3 col=vec3(0.0);float tot=0.0;float sigma=max(uRadius/3.0,0.5);for(int i=-16;i<=16;i++){float fi=float(i);float w=exp(-0.5*fi*fi/(sigma*sigma));vec2 uv=clamp(vUv+dir*fi*sigma/300.0,0.0,1.0);col+=texture2D(uTexture,uv).rgb*w;tot+=w;}col/=tot;vec3 result=mix(c.rgb,col,uIntensity);gl_FragColor=vec4(result,c.a);}`;
export const bccBlurEffect:EffectModule={definition:def('bccBlur','BCC Blur','blurSharpen','BCC-style directional blur with variable angle and aspect.',1,[
param({id:'radius',name:'Radius',value:10,defaultValue:10,min:1,max:100,step:1,uniform:'uRadius'}),
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uIntensity'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'aspect',name:'Aspect',value:1,defaultValue:1,min:0.1,max:10,step:0.1,uniform:'uAspect'}),
]),fragmentShader:FRAG,};