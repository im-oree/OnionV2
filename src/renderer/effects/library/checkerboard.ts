import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uWidth;uniform float uHeight;uniform vec3 uColor1;uniform vec3 uColor2;uniform float uBlend;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 pos=fract(vUv*vec2(uWidth,uHeight));float check=step(0.5,mod(floor(vUv.x*uWidth)+floor(vUv.y*uHeight),2.0));vec3 pat=mix(uColor1,uColor2,check);vec3 result=mix(c.rgb,pat,uBlend);gl_FragColor=vec4(result,c.a);}`;
export const checkerboardEffect:EffectModule={definition:def('checkerboard','Checkerboard','generate','Checkerboard pattern generator that composites over the source.',1,[
param({id:'width',name:'Width',value:10,defaultValue:10,min:1,max:100,step:1,uniform:'uWidth'}),
param({id:'height',name:'Height',value:10,defaultValue:10,min:1,max:100,step:1,uniform:'uHeight'}),
param({id:'color1',name:'Color 1',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uColor1'}),
param({id:'color2',name:'Color 2',type:'color',value:'#000000',defaultValue:'#000000',uniform:'uColor2'}),
param({id:'blend',name:'Blend With Original',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
