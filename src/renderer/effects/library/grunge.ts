import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uAmount;uniform float uScale;uniform float uContrast;uniform float uRandomSeed;uniform vec2 uResolution;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p+uRandomSeed,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=floor(vUv*uResolution/uScale);float g=hash(uv);g=smoothstep(0.5-uContrast*0.4,0.5+uContrast*0.4,g);vec3 result=mix(c.rgb,c.rgb*vec3(0.7,0.65,0.6),g*uAmount);gl_FragColor=vec4(result,c.a);}`;
export const grungeEffect:EffectModule={definition:def('grunge','Grunge','stylize','Grunge/dirt texture overlay with procedural noise.',1,[
param({id:'amount',name:'Amount',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uAmount'}),
param({id:'scale',name:'Scale',value:100,defaultValue:100,min:10,max:500,step:10,uniform:'uScale'}),
param({id:'contrast',name:'Contrast',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uContrast'}),
param({id:'randomSeed',name:'Random Seed',value:0,defaultValue:0,min:0,max:100,step:1,uniform:'uRandomSeed'}),
]),fragmentShader:FRAG,};
