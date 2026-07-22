import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uRedMix;uniform float uGreenMix;uniform float uBlueMix;uniform float uBrightness;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float gray=c.r*uRedMix+c.g*uGreenMix+c.b*uBlueMix;gl_FragColor=vec4(mix(vec3(gray),c.rgb,uBrightness),c.a);}`;
export const blackAndWhiteEffect:EffectModule={definition:def('blackAndWhite','Black & White','color','Grayscale conversion with per-channel mix.',1,[
param({id:'redMix',name:'Red Mix',value:0.299,defaultValue:0.299,min:0,max:2,step:0.01,uniform:'uRedMix'}),
param({id:'greenMix',name:'Green Mix',value:0.587,defaultValue:0.587,min:0,max:2,step:0.01,uniform:'uGreenMix'}),
param({id:'blueMix',name:'Blue Mix',value:0.114,defaultValue:0.114,min:0,max:2,step:0.01,uniform:'uBlueMix'}),
param({id:'brightness',name:'Colorize',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uBrightness'}),
]),fragmentShader:FRAG,};
