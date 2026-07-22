import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uDensity;uniform float uTwinkle;uniform float uSize;uniform float uSpeed;uniform float uTime;uniform vec2 uDirection;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv*uDensity*50.0+uDirection*uTime*uSpeed;vec2 id=floor(uv);vec2 fv=fract(uv)-0.5;float r=hash(id);float star=smoothstep(0.995,1.0,r)*uSize;float d=1.0-length(fv);float twinkle=mix(1.0,0.5+0.5*sin(uTime*3.0+id.x*100.0+id.y),uTwinkle);star=star*d*2.0*twinkle;vec3 col=mix(c.rgb,vec3(1.0),star);gl_FragColor=vec4(col,c.a);}`;
export const starfieldEffect:EffectModule={definition:def('starfield','Starfield','generate','Procedural star field with twinkle and motion.',1,[
param({id:'density',name:'Density',value:0.5,defaultValue:0.5,min:0.1,max:1,step:0.05,uniform:'uDensity'}),
param({id:'twinkle',name:'Twinkle',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uTwinkle'}),
param({id:'size',name:'Size',value:1,defaultValue:1,min:0.1,max:5,step:0.1,uniform:'uSize'}),
param({id:'speed',name:'Speed',value:0,defaultValue:0,min:0,max:2,step:0.01,uniform:'uSpeed'}),
param({id:'dirX',name:'Dir X',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uDirX'}),
param({id:'dirY',name:'Dir Y',value:-1,defaultValue:-1,min:-1,max:1,step:0.01,uniform:'uDirY'}),
]),fragmentShader:FRAG,usesTime:true,};
