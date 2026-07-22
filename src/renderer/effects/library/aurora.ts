import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uIntensity;uniform float uSpeed;uniform float uHeight;uniform vec3 uColor1;uniform vec3 uColor2;uniform float uTime;uniform float uBlend;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*hash(p);p=mat2(0.8,-0.6,0.6,0.8)*p*2.0;a*=0.5;}return v;}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv*vec2(1.0,uHeight)+uTime*uSpeed;float aurora=fbm(uv);aurora=sin(aurora*20.0+uv.y*5.0)*0.5+0.5;aurora=smoothstep(0.3,0.8,aurora)*uIntensity;vec3 col=mix(uColor1,uColor2,aurora)*aurora;vec3 result=mix(c.rgb,c.rgb+col,uBlend);gl_FragColor=vec4(result,c.a);}`;
export const auroraEffect:EffectModule={definition:def('aurora','Aurora','generate','Procedural aurora borealis effect.',1,[
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:3,step:0.1,uniform:'uIntensity'}),
param({id:'speed',name:'Speed',value:0.2,defaultValue:0.2,min:0,max:2,step:0.01,uniform:'uSpeed'}),
param({id:'height',name:'Height',value:3,defaultValue:3,min:0.5,max:10,step:0.5,uniform:'uHeight'}),
param({id:'color1',name:'Color 1',type:'color',value:'#00ff88',defaultValue:'#00ff88',uniform:'uColor1'}),
param({id:'color2',name:'Color 2',type:'color',value:'#0088ff',defaultValue:'#0088ff',uniform:'uColor2'}),
param({id:'blend',name:'Blend',value:0.7,defaultValue:0.7,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,usesTime:true,};
