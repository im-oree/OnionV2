import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uCount;uniform float uIntensity;uniform float uSize;uniform float uSpeed;uniform float uTime;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec3 sparkle=vec3(0.0);float nc=max(uCount,1.0);for(int i=0;i<30;i++){float fi=float(i);if(fi>=nc)break;vec2 pos=vec2(hash(vec2(i,0.0)),hash(vec2(i,1.0)));float phase=hash(vec2(i,2.0))*6.283;float life=sin(uTime*uSpeed+phase)*0.5+0.5;life=pow(life,3.0);vec2 dir=vUv-pos;float d=1.0-length(dir)/max(uSize*0.1,0.001);float spark=clamp(d,0.0,1.0)*life*uIntensity;sparkle+=vec3(spark);}gl_FragColor=vec4(c.rgb+sparkle,c.a);}`;
export const sparklesEffect:EffectModule={definition:def('sparkles','Sparkles','generate','Twinkling sparkle particles overlay.',1,[
param({id:'count',name:'Count',value:20,defaultValue:20,min:1,max:50,step:1,uniform:'uCount'}),
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uIntensity'}),
param({id:'size',name:'Size',value:5,defaultValue:5,min:1,max:20,step:1,uniform:'uSize'}),
param({id:'speed',name:'Speed',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uSpeed'}),
]),fragmentShader:FRAG,usesTime:true,};
