import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uPoint1;uniform vec2 uPoint2;uniform float uAmount;varying vec2 vUv;void main(){vec2 dir=uPoint2-uPoint1;float len=length(dir);if(len<0.001){gl_FragColor=texture2D(uTexture,vUv);return;}dir=normalize(dir);vec2 perp=vec2(-dir.y,dir.x);vec2 toPix=vUv-uPoint1;float along=dot(toPix,dir);float across=dot(toPix,perp);float warp=sin(along*3.14159)*uAmount*0.1;vec2 uv=vUv+perp*warp*exp(-abs(along)*4.0);gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccFloMotionEffect:EffectModule={definition:def('ccFloMotion','CC Flo Motion','distort','Liquid flow distortion between two control points.',1,[
param({id:'point1X',name:'Point 1 X',value:0.3,defaultValue:0.3,min:-0.5,max:1.5,step:0.005,uniform:'uPoint1X'}),
param({id:'point1Y',name:'Point 1 Y',value:0.5,defaultValue:0.5,min:-0.5,max:1.5,step:0.005,uniform:'uPoint1Y'}),
param({id:'point2X',name:'Point 2 X',value:0.7,defaultValue:0.7,min:-0.5,max:1.5,step:0.005,uniform:'uPoint2X'}),
param({id:'point2Y',name:'Point 2 Y',value:0.5,defaultValue:0.5,min:-0.5,max:1.5,step:0.005,uniform:'uPoint2Y'}),
param({id:'amount',name:'Amount',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uAmount'}),
]),fragmentShader:FRAG,};
