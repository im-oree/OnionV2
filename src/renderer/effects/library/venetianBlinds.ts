import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uCount;uniform float uAngle;uniform float uFeather;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad));float pos=dot(vUv,dir);float stripe=fract(pos*uCount);float alpha=smoothstep(0.0,uFeather,stripe-uProgress+uFeather*0.5);gl_FragColor=vec4(c.rgb*alpha,c.a*alpha);}`;
export const venetianBlindsEffect:EffectModule={definition:def('venetianBlinds','Venetian Blinds','transition','Sliding blinds/venetian transition effect.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'count',name:'Count',value:30,defaultValue:30,min:2,max:100,step:1,uniform:'uCount'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'feather',name:'Feather',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uFeather'}),
]),fragmentShader:FRAG,};
