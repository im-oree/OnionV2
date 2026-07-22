import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec3 uLift;uniform vec3 uGamma;uniform vec3 uGain;uniform vec3 uOffset;uniform float uSaturation;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 col=uGain*c.rgb+uOffset;col=pow(col,1.0/max(uGamma,0.001));col+=uLift;float lum=dot(col,vec3(0.2126,0.7152,0.0722));col=mix(vec3(lum),col,uSaturation);gl_FragColor=vec4(clamp(col,0.0,1.0),c.a);}`;
export const threeWayColorGradeEffect:EffectModule={definition:def('threeWayColorGrade','3-Way Color Grade','color','Lift/Gamma/Gain color grading with saturation control.',1,[
param({id:'liftR',name:'Lift Red',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.01,uniform:'uLiftR'}),
param({id:'liftG',name:'Lift Green',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.01,uniform:'uLiftG'}),
param({id:'liftB',name:'Lift Blue',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.01,uniform:'uLiftB'}),
param({id:'gammaR',name:'Gamma Red',value:1,defaultValue:1,min:0.2,max:5,step:0.01,uniform:'uGammaR'}),
param({id:'gammaG',name:'Gamma Green',value:1,defaultValue:1,min:0.2,max:5,step:0.01,uniform:'uGammaG'}),
param({id:'gammaB',name:'Gamma Blue',value:1,defaultValue:1,min:0.2,max:5,step:0.01,uniform:'uGammaB'}),
param({id:'gainR',name:'Gain Red',value:1,defaultValue:1,min:0,max:2,step:0.01,uniform:'uGainR'}),
param({id:'gainG',name:'Gain Green',value:1,defaultValue:1,min:0,max:2,step:0.01,uniform:'uGainG'}),
param({id:'gainB',name:'Gain Blue',value:1,defaultValue:1,min:0,max:2,step:0.01,uniform:'uGainB'}),
param({id:'offset',name:'Master Offset',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.01,uniform:'uOffsetV'}),
param({id:'saturation',name:'Saturation',value:1,defaultValue:1,min:0,max:2,step:0.01,uniform:'uSaturation'}),
]),fragmentShader:FRAG,};
