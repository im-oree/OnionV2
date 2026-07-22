import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uDensity;uniform float uSpeed;uniform float uSize;uniform float uWobble;uniform float uOpacity;uniform float uTime;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 uv=vUv*vec2(50.0,200.0);uv.x+=uTime*uWobble*sin(uv.y*0.5+uTime);uv.y+=uTime*uSpeed;vec2 id=floor(uv);vec2 fv=fract(uv);float r=hash(id);float flake=smoothstep(0.997-0.01*uDensity,1.0,r);float spark=pow(1.0-length(fv-0.5)*2.0,4.0)*flake*uSize;float alpha=spark*uOpacity;vec3 snow=mix(c.rgb,vec3(1.0),alpha*0.8);gl_FragColor=vec4(mix(c.rgb,snow,alpha),c.a);}`;
export const ccSnowEffect:EffectModule={definition:def('ccSnow','CC Snow','generate','Snowfall simulation with wind wobble.',1,[
param({id:'density',name:'Density',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uDensity'}),
param({id:'speed',name:'Speed',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uSpeed'}),
param({id:'size',name:'Size',value:1,defaultValue:1,min:0.1,max:5,step:0.1,uniform:'uSize'}),
param({id:'wobble',name:'Wobble',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uWobble'}),
param({id:'opacity',name:'Opacity',value:0.8,defaultValue:0.8,min:0,max:1,step:0.01,uniform:'uOpacity'}),
]),fragmentShader:FRAG,usesTime:true,};
