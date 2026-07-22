import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uSegments;uniform float uAngle;varying vec2 vUv;void main(){vec2 dir=vUv-uCenter;float a=atan(dir.y,dir.x)+uAngle*3.14159;float r=length(dir);float seg=6.283/max(uSegments,1.0);a=mod(a,seg);a=abs(a-seg*0.5);vec2 uv=uCenter+vec2(cos(a),sin(a))*r;gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccKaleidaEffect:EffectModule={definition:def('ccKaleida','CC Kaleida','generate','Kaleidoscope mirror tiling effect.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'segments',name:'Segments',value:6,defaultValue:6,min:2,max:32,step:1,uniform:'uSegments'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uAngle'}),
]),fragmentShader:FRAG,};
