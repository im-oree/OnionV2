import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uIntensity;uniform float uLength;uniform float uThreshold;uniform vec3 uColor;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float bright=smoothstep(uThreshold-0.05,uThreshold+0.05,lum);vec2 dir=uCenter-vUv;float dist=length(dir);dir=normalize(dir);vec3 ray=vec3(0.0);float tot=0.0;int steps=48;for(int i=0;i<48;i++){float fi=float(i);float t=fi/float(steps)*dist*uLength;vec2 uv=clamp(vUv+dir*t,0.0,1.0);float w=exp(-fi/8.0);ray+=texture2D(uTexture,uv).rgb*w;tot+=w;}ray=ray/max(tot,0.001)*uColor*bright*uIntensity;gl_FragColor=vec4(c.rgb+ray,c.a);}`;
export const raysGlowEffect:EffectModule={definition:def('raysGlow','Rays Glow','generate','Radial glow streaks emanating from a center point.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'intensity',name:'Intensity',value:1.5,defaultValue:1.5,min:0,max:5,step:0.1,uniform:'uIntensity'}),
param({id:'length',name:'Ray Length',value:0.5,defaultValue:0.5,min:0.05,max:2,step:0.05,uniform:'uLength'}),
param({id:'threshold',name:'Threshold',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uThreshold'}),
param({id:'color',name:'Color',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uColor'}),
]),fragmentShader:FRAG,};
