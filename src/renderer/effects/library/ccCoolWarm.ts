import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uTemperature;uniform float uTint;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float r=c.r,g=c.g,b=c.b;r+=uTemperature*0.1;b-=uTemperature*0.1;g+=uTint*0.05;r-=uTint*0.05;gl_FragColor=vec4(clamp(vec3(r,g,b),0.0,1.0),c.a);}`;
export const ccCoolWarmEffect:EffectModule={definition:def('ccCoolWarm','CC Cool Warm','color','Adjust color temperature and tint.',1,[
param({id:'temperature',name:'Temperature',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uTemperature'}),
param({id:'tint',name:'Tint',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uTint'}),
]),fragmentShader:FRAG,};
