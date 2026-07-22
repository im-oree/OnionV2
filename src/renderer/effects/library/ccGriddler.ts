import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uSize;uniform float uRotation;varying vec2 vUv;void main(){vec2 dir=vUv-uCenter;float a=atan(dir.y,dir.x)+uRotation*3.14159;float r=length(dir)/max(uSize*0.5,0.001);vec2 grid=vec2(cos(a)/r,sin(a)/r);vec2 uv=uCenter+grid*uSize*0.2;gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccGriddlerEffect:EffectModule={definition:def('ccGriddler','CC Griddler','distort','Grid-based polar distortion.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'size',name:'Size',value:0.5,defaultValue:0.5,min:0.05,max:2,step:0.01,uniform:'uSize'}),
param({id:'rotation',name:'Rotation',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uRotation'}),
]),fragmentShader:FRAG,};
