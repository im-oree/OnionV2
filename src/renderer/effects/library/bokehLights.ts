import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uBrightness;uniform float uSize;uniform float uIntensity;uniform float uRandomSeed;uniform vec2 uResolution;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p+uRandomSeed,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv*vec2(30.0,30.0*uResolution.y/uResolution.x);vec2 id=floor(uv);vec2 fv=fract(uv)-0.5;float r=hash(id);float s=step(0.995-uBrightness*0.1,r);float bokeh=smoothstep(0.5,0.0,length(fv))*s*uSize*0.1;vec3 col=c.rgb+vec3(bokeh*uIntensity);gl_FragColor=vec4(col,c.a);}`;
export const bokehLightsEffect:EffectModule={definition:def('bokehLights','Bokeh Lights','generate','Bokeh-style circle highlights from bright areas.',1,[
param({id:'brightness',name:'Brightness',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uBrightness'}),
param({id:'size',name:'Size',value:1,defaultValue:1,min:0.1,max:5,step:0.1,uniform:'uSize'}),
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uIntensity'}),
param({id:'randomSeed',name:'Random Seed',value:0,defaultValue:0,min:0,max:100,step:1,uniform:'uRandomSeed'}),
]),fragmentShader:FRAG,};
