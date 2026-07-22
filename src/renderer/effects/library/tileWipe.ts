import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uColumns;uniform float uRows;uniform float uPhase;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 grid=floor(vUv*vec2(uColumns,uRows));float idx=grid.x+grid.y*uColumns;float total=max(uColumns*uRows,1.0);float order=idx/total;float delay=order*uPhase;float p=clamp((uProgress-delay)*max(uColumns,uRows),0.0,1.0);vec2 uv=vUv;uv.x=mix(uv.x,1.0-uv.x,step(0.5,p));uv.y=mix(uv.y,1.0-uv.y,step(0.5,p));float alpha=step(order,uProgress);vec4 t=texture2D(uTexture,clamp(uv,0.0,1.0));gl_FragColor=vec4(mix(c.rgb,t.rgb,alpha)*alpha,c.a*alpha);}`;
export const tileWipeEffect:EffectModule={definition:def('tileWipe','Tile Wipe','transition','Tile flip/rotate wipe transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'columns',name:'Columns',value:8,defaultValue:8,min:1,max:50,step:1,uniform:'uColumns'}),
param({id:'rows',name:'Rows',value:8,defaultValue:8,min:1,max:50,step:1,uniform:'uRows'}),
param({id:'phase',name:'Phase',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uPhase'}),
]),fragmentShader:FRAG,};
