import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSlant;uniform float uStretch;uniform float uCenter;varying vec2 vUv;void main(){vec2 uv=vUv;uv.x+=uSlant*(uv.y-uCenter)*0.5;uv.y=mix(uv.y,(uv.y-uCenter)/max(1.0-uStretch,0.01)+uCenter,abs(uStretch));gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccSlantEffect:EffectModule={definition:def('ccSlant','CC Slant','distort','Slant/shear transform with stretch control.',1,[
param({id:'slant',name:'Slant',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uSlant'}),
param({id:'stretch',name:'Stretch',value:0,defaultValue:0,min:-0.9,max:0.9,step:0.01,uniform:'uStretch'}),
param({id:'center',name:'Center',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uCenter'}),
]),fragmentShader:FRAG,};
