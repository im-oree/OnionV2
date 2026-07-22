import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uSpin;uniform float uSegments;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 center=vec2(0.5,0.5);vec2 dir=vUv-center;float dist=length(dir);float a=atan(dir.y,dir.x);float twist=a+uSpin*3.14159*uProgress*(1.0-dist)*2.0;float se=max(uSegments,1.0);float slice=floor(twist/(6.283/se));float alpha=1.0-smoothstep(0.0,1.0,slice/se-uProgress*2.0);alpha=clamp(alpha,0.0,1.0);gl_FragColor=vec4(c.rgb*alpha,c.a*alpha);}`;
export const twisterWipeEffect:EffectModule={definition:def('twisterWipe','Twister Wipe','transition','Twisting/twirling wipe transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'spin',name:'Spin',value:2,defaultValue:2,min:0.5,max:5,step:0.5,uniform:'uSpin'}),
param({id:'segments',name:'Segments',value:6,defaultValue:6,min:2,max:32,step:1,uniform:'uSegments'}),
]),fragmentShader:FRAG,};
