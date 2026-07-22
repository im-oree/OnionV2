import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uAmount;uniform float uBlockSize;uniform float uJitter;uniform float uTime;uniform float uRandomSeed;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p+uRandomSeed,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv/max(uBlockSize*0.01,0.001);vec2 id=floor(uv);float r=hash(id+floor(uTime));float glitch=step(1.0-uAmount*0.5,r);float offset=(hash(id+vec2(100.0,0.0))-0.5)*uJitter*glitch*0.1;vec2 uv2=clamp(vUv+vec2(offset,0.0),0.0,1.0);vec4 g=texture2D(uTexture,uv2);vec3 col=mix(c.rgb,g.rgb,glitch);float bw=step(0.95,r)*glitch;col=mix(col,vec3(1.0,1.0,1.0)*step(0.5,hash(id+vec2(200.0,0.0))),bw*0.5);gl_FragColor=vec4(col,c.a);}`;
export const digitalDamageEffect:EffectModule={definition:def('digitalDamage','Digital Damage','stylize','Digital glitch/artifact damage simulation.',1,[
param({id:'amount',name:'Amount',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uAmount'}),
param({id:'blockSize',name:'Block Size',value:20,defaultValue:20,min:2,max:100,step:1,uniform:'uBlockSize'}),
param({id:'jitter',name:'Jitter',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uJitter'}),
param({id:'randomSeed',name:'Random Seed',value:0,defaultValue:0,min:0,max:100,step:1,uniform:'uRandomSeed'}),
]),fragmentShader:FRAG,usesTime:true,};
