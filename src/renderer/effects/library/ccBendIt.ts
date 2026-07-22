import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uAmount;uniform float uRadius;varying vec2 vUv;void main(){vec2 dir=vUv-uCenter;float dist=length(dir);float bend=sin(dist*uRadius*6.28)*uAmount*0.05;vec2 uv=vUv+dir*bend;gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccBendItEffect:EffectModule={definition:def('ccBendIt','CC Bend It','distort','Bend the layer around a center point.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'amount',name:'Amount',value:1,defaultValue:1,min:-5,max:5,step:0.1,uniform:'uAmount'}),
param({id:'radius',name:'Radius',value:1,defaultValue:1,min:0.1,max:5,step:0.1,uniform:'uRadius'}),
]),fragmentShader:FRAG,};
