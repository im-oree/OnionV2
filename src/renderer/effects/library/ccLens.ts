import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uDistortion;uniform float uCurvature;varying vec2 vUv;void main(){vec2 dir=vUv-uCenter;float dist=length(dir);float barrel=1.0+uDistortion*dist*dist;vec2 uv=uCenter+dir/barrel;float vignette=1.0-uCurvature*dist;gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0))*vignette;}`;
export const ccLensEffect:EffectModule={definition:def('ccLens','CC Lens','distort','Classic lens distortion with barrel/pincushion control.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'distortion',name:'Distortion',value:0.3,defaultValue:0.3,min:-1,max:1,step:0.01,uniform:'uDistortion'}),
param({id:'curvature',name:'Curvature',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uCurvature'}),
]),fragmentShader:FRAG,};
