import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uIntensity;uniform float uRate;uniform float uDuration;uniform float uRandomSeed;uniform float uTime;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p+uRandomSeed,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);float t=floor(uTime*uRate);float r=hash(vec2(t,0.0));float flash=smoothstep(0.999,1.0,r)*step(0.01,uDuration)*uIntensity;vec3 col=mix(c.rgb,vec3(1.0),flash);gl_FragColor=vec4(col,c.a);}`;
export const flashbulbsEffect:EffectModule={definition:def('flashbulbs','Flashbulbs','generate','Random flash bulb pops at adjustable rate.',1,[
param({id:'intensity',name:'Intensity',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uIntensity'}),
param({id:'rate',name:'Rate',value:1,defaultValue:1,min:0.1,max:10,step:0.1,uniform:'uRate'}),
param({id:'duration',name:'Duration',value:0.1,defaultValue:0.1,min:0.01,max:1,step:0.01,uniform:'uDuration'}),
param({id:'randomSeed',name:'Random Seed',value:0,defaultValue:0,min:0,max:100,step:1,uniform:'uRandomSeed'}),
]),fragmentShader:FRAG,usesTime:true,};
