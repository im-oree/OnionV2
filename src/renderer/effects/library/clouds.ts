import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uDensity;uniform float uCoverage;uniform float uSpeed;uniform float uSharpness;uniform float uTime;uniform float uBlend;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float fbm(vec2 p){float v=0.0,a=0.5;mat2 r=mat2(0.8,-0.6,0.6,0.8);for(int i=0;i<5;i++){v+=a*hash(p);p=r*p*2.0;a*=0.5;}return v;}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv*uDensity+uTime*uSpeed;float cloud=fbm(uv);cloud=smoothstep(1.0-uCoverage*0.8,1.0,cloud);cloud=pow(cloud,uSharpness);vec3 result=mix(c.rgb,mix(c.rgb,vec3(1.0),cloud*0.3),uBlend);gl_FragColor=vec4(result,c.a);}`;
export const cloudsEffect:EffectModule={definition:def('clouds','Clouds','generate','Procedural cloud texture overlay.',1,[
param({id:'density',name:'Density',value:3,defaultValue:3,min:0.5,max:10,step:0.5,uniform:'uDensity'}),
param({id:'coverage',name:'Coverage',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uCoverage'}),
param({id:'speed',name:'Speed',value:0.1,defaultValue:0.1,min:0,max:2,step:0.01,uniform:'uSpeed'}),
param({id:'sharpness',name:'Sharpness',value:1,defaultValue:1,min:0.1,max:5,step:0.1,uniform:'uSharpness'}),
param({id:'blend',name:'Blend',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,usesTime:true,};
