import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uBlockSize;uniform float uFeather;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 grid=floor(vUv/max(uBlockSize*0.01,0.001));float r=hash(grid);float threshold=smoothstep(uProgress-uFeather*0.5,uProgress+uFeather*0.5,r);gl_FragColor=vec4(c.rgb*threshold,c.a*threshold);}`;
export const blockDissolveEffect:EffectModule={definition:def('blockDissolve','Block Dissolve','transition','Block-based random dissolve transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'blockSize',name:'Block Size',value:30,defaultValue:30,min:2,max:100,step:1,uniform:'uBlockSize'}),
param({id:'feather',name:'Feather',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uFeather'}),
]),fragmentShader:FRAG,};
