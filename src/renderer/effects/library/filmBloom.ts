import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uRadius;uniform float uIntensity;uniform vec3 uTint;uniform float uThreshold;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float sigma=max(uRadius/3.0,0.5);vec3 bloom=vec3(0.0);float tot=0.0;for(int i=-8;i<=8;i++){float fi=float(i);float w=exp(-0.5*fi*fi/(sigma*sigma));vec2 uv=clamp(vUv+vec2(fi*0.002,0.0),0.0,1.0);vec3 s=texture2D(uTexture,uv).rgb;float lum=dot(s,vec3(0.2126,0.7152,0.0722));s*=smoothstep(uThreshold-0.1,uThreshold+0.1,lum)*2.0;bloom+=s*w;tot+=w;}bloom=bloom/tot;vec3 result=c.rgb+bloom*uTint*uIntensity;gl_FragColor=vec4(clamp(result,0.0,1.0),c.a);}`;
export const filmBloomEffect:EffectModule={definition:def('filmBloom','Film Bloom','stylize','Soft film bloom with halation and color tint.',1,[
param({id:'radius',name:'Radius',value:20,defaultValue:20,min:1,max:100,step:1,uniform:'uRadius'}),
param({id:'intensity',name:'Intensity',value:0.5,defaultValue:0.5,min:0,max:3,step:0.1,uniform:'uIntensity'}),
param({id:'tint',name:'Tint',type:'color',value:'#ffddaa',defaultValue:'#ffddaa',uniform:'uTint'}),
param({id:'threshold',name:'Threshold',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uThreshold'}),
]),fragmentShader:FRAG,};
