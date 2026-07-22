import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uBend;uniform float uTaper;uniform float uTwist;uniform vec2 uCenter;varying vec2 vUv;void main(){vec2 uv=vUv-uCenter;float d=length(uv);float a=atan(uv.y,uv.x);a+=uTwist*d*3.14159;uv=vec2(cos(a),sin(a))*d;uv.x+=uBend*uv.y*uv.y*0.5;uv.y*=1.0+uTaper*(uv.x-0.5);vec2 final=uv+uCenter;gl_FragColor=texture2D(uTexture,clamp(final,0.0,1.0));}`;
export const bendTaperTwistEffect:EffectModule={definition:def('bendTaperTwist','Bend Taper Twist','distort','Advanced bend, taper, and twist warp effect.',1,[
param({id:'bend',name:'Bend',value:0,defaultValue:0,min:-2,max:2,step:0.05,uniform:'uBend'}),
param({id:'taper',name:'Taper',value:0,defaultValue:0,min:-1,max:1,step:0.05,uniform:'uTaper'}),
param({id:'twist',name:'Twist',value:0,defaultValue:0,min:-2,max:2,step:0.05,uniform:'uTwist'}),
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
]),fragmentShader:FRAG,};
