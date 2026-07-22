import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uRippleAmount;uniform float uFrequency;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv;uv+=vec2(sin(vUv.y*uFrequency+uProgress*20.0),cos(vUv.x*uFrequency+uProgress*20.0))*uRippleAmount*0.05*(1.0-uProgress);vec4 r=texture2D(uTexture,clamp(uv,0.0,1.0));float alpha=mix(1.0,0.0,smoothstep(0.0,1.0,uProgress));gl_FragColor=vec4(mix(c.rgb,r.rgb,1.0-alpha)*alpha,c.a*alpha);}`;
export const rippleDissolveEffect:EffectModule={definition:def('rippleDissolve','Ripple Dissolve','transition','Ripple dissolve transition effect.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'rippleAmount',name:'Ripple Amount',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uRippleAmount'}),
param({id:'frequency',name:'Frequency',value:20,defaultValue:20,min:2,max:100,step:1,uniform:'uFrequency'}),
]),fragmentShader:FRAG,};
