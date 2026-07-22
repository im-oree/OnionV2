import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec3 uTargetColor;uniform float uTolerance;uniform float uSoftness;uniform float uDesaturateAmount;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 diff=c.rgb-uTargetColor;float dist=length(diff);float mask=1.0-smoothstep(uTolerance*(1.0-uSoftness),uTolerance,dist);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));vec3 desat=mix(c.rgb,vec3(lum),uDesaturateAmount);vec3 result=mix(desat,c.rgb,mask);gl_FragColor=vec4(result,c.a);}`;
export const leaveColorEffect:EffectModule={definition:def('leaveColor','Leave Color','color','Isolate a single color and desaturate the rest.',1,[
param({id:'color',name:'Target Color',type:'color',value:'#ff0000',defaultValue:'#ff0000',uniform:'uTargetColor'}),
param({id:'tolerance',name:'Tolerance',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uTolerance'}),
param({id:'softness',name:'Softness',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uSoftness'}),
param({id:'desaturateAmount',name:'Desaturate','type':'percent',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uDesaturateAmount'}),
]),fragmentShader:FRAG,};
