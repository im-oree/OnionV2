import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uScratches;uniform float uDust;uniform float uFlicker;uniform float uBurn;uniform float uRandomSeed;uniform float uTime;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p+uRandomSeed,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec3 col=c.rgb;float h1=hash(vec2(vUv.y*500.0+floor(uTime*24.0)));float scratch=step(1.0-uScratches*0.05,h1)*step(0.9,hash(vec2(vUv.y*13.0)));col=mix(col,vec3(1.0)*step(0.0,scratch-0.5),scratch*0.8);float dust=step(0.998-uDust*0.005,hash(vUv*vec2(100.0,100.0)));col=mix(col,vec3(0.0),dust);float flicker=mix(1.0,0.7+hash(vec2(floor(uTime*30.0),0.0))*0.3,step(0.5,uFlicker)*step(0.95,hash(vec2(floor(uTime*20.0),1.0))));col*=flicker;float burn=step(0.999-uBurn*0.005,hash(floor(vUv*vec2(200.0,5.0))));col=mix(col,vec3(1.0,0.6,0.1),burn*0.5);gl_FragColor=vec4(clamp(col,0.0,1.0),c.a);}`;
export const damagedFilmEffect:EffectModule={definition:def('damagedFilm','Damaged Film','stylize','Heavy film damage simulation with scratches, dust, flicker, and burns.',1,[
param({id:'scratches',name:'Scratches',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uScratches'}),
param({id:'dust',name:'Dust',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uDust'}),
param({id:'flicker',name:'Flicker',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uFlicker'}),
param({id:'burn',name:'Burn',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uBurn'}),
param({id:'randomSeed',name:'Random Seed',value:0,defaultValue:0,min:0,max:100,step:1,uniform:'uRandomSeed'}),
]),fragmentShader:FRAG,usesTime:true,};
