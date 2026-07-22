import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSensitivity;uniform float uAmount;uniform float uTime;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float avgLum=0.0;int samples=0;for(int y=-4;y<=4;y+=2){for(int x=-4;x<=4;x+=2){vec2 uv=clamp(vUv+vec2(float(x),float(y))*0.004,0.0,1.0);avgLum+=dot(texture2D(uTexture,uv).rgb,vec3(0.2126,0.7152,0.0722));samples++;}}avgLum/=float(max(samples,1));float flicker=lum/avgLum;float smoothFlicker=mix(1.0,flicker,uSensitivity);vec3 result=c.rgb/smoothFlicker*mix(1.0,smoothFlicker,uAmount);gl_FragColor=vec4(clamp(result,0.0,1.0),c.a);}`;
export const deflickerEffect:EffectModule={definition:def('deflicker','De-flicker','stylize','Remove exposure flicker by normalizing local brightness.',1,[
param({id:'sensitivity',name:'Sensitivity',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uSensitivity'}),
param({id:'amount',name:'Amount',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uAmount'}),
]),fragmentShader:FRAG,usesTime:true,};
