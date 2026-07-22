import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uRedPhase;uniform float uGreenPhase;uniform float uBluePhase;uniform float uSaturation;uniform float uOffset;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float r=c.r+uOffset;float g=c.g+uOffset;float b=c.b+uOffset;r+=uRedPhase;g+=uGreenPhase;b+=uBluePhase;vec3 result=vec3(r,g,b);float lum=dot(result,vec3(0.2126,0.7152,0.0722));result=mix(vec3(lum),result,uSaturation);gl_FragColor=vec4(clamp(result,0.0,1.0),c.a);}`;
export const ccColorOffsetEffect:EffectModule={definition:def('ccColorOffset','CC Color Offset','color','Offset RGB channels independently with phase cycling.',1,[
param({id:'redPhase',name:'Red Phase',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uRedPhase'}),
param({id:'greenPhase',name:'Green Phase',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uGreenPhase'}),
param({id:'bluePhase',name:'Blue Phase',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uBluePhase'}),
param({id:'saturation',name:'Saturation',value:1,defaultValue:1,min:0,max:2,step:0.01,uniform:'uSaturation'}),
param({id:'offset',name:'Master Offset',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uOffset'}),
]),fragmentShader:FRAG,};
