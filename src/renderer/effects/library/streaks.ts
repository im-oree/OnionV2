import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uLength;uniform float uAngle;uniform float uIntensity;uniform vec2 uResolution;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad))/uResolution*max(uLength,1.0);vec3 col=vec3(0.0);float tot=0.0;for(int i=-20;i<=20;i++){float fi=float(i);float w=exp(-0.5*fi*fi/100.0);vec2 uv=clamp(vUv+dir*fi,0.0,1.0);col+=texture2D(uTexture,uv).rgb*w;tot+=w;}col=col/tot;gl_FragColor=vec4(mix(c.rgb,col,uIntensity),c.a);}`;
export const streaksEffect:EffectModule={definition:def('streaks','Streaks','blurSharpen','Horizontal/vertical streak blur effect.',1,[
param({id:'length',name:'Length',value:50,defaultValue:50,min:1,max:200,step:1,uniform:'uLength'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'intensity',name:'Intensity',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uIntensity'}),
]),fragmentShader:FRAG,};
