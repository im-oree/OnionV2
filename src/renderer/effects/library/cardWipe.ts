import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uCols;uniform float uRows;uniform float uFlipAngle;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 grid=floor(vUv*vec2(uCols,uRows));float idx=grid.x+grid.y*uCols;float total=max(uCols*uRows,1.0);float order=idx/total;float prog=clamp((uProgress-order)*uCols,0.0,1.0);float flip=abs(prog*2.0-1.0);float scale=mix(1.0,0.0,step(0.5,prog));float vis=step(order,uProgress);gl_FragColor=vec4(c.rgb*vis,c.a*vis);}`;
export const cardWipeEffect:EffectModule={definition:def('cardWipe','Card Wipe','transition','Card flip/reveal wipe transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'cols',name:'Columns',value:10,defaultValue:10,min:1,max:50,step:1,uniform:'uCols'}),
param({id:'rows',name:'Rows',value:10,defaultValue:10,min:1,max:50,step:1,uniform:'uRows'}),
param({id:'flipAngle',name:'Flip Angle',value:90,defaultValue:90,min:0,max:360,step:1,uniform:'uFlipAngle'}),
]),fragmentShader:FRAG,};
