import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec3 uColor;uniform float uDensity;uniform float uPreserveLum;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float srcLum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));vec3 filtered=mix(c.rgb,uColor,uDensity);float filtLum=dot(filtered,vec3(0.2126,0.7152,0.0722));filtered=mix(filtered,filtered*(srcLum/max(filtLum,0.001)),uPreserveLum);gl_FragColor=vec4(filtered,c.a);}`;
export const photoFilterEffect:EffectModule={definition:def('photoFilter','Photo Filter','color','Simulate a colored filter over the lens.',1,[
param({id:'color',name:'Filter Color',type:'color',value:'#ff8c00',defaultValue:'#ff8c00',uniform:'uColor'}),
param({id:'density',name:'Density',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uDensity'}),
param({id:'preserveLum',name:'Preserve Luminosity',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uPreserveLum'}),
]),fragmentShader:FRAG,};
