import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uFeather;uniform float uInvert;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float w=mix(lum,1.0-lum,uInvert);float alpha=smoothstep(uProgress-uFeather*0.5,uProgress+uFeather*0.5,w);gl_FragColor=vec4(c.rgb*alpha,c.a*alpha);}`;
export const gradientWipeEffect:EffectModule={definition:def('gradientWipe','Gradient Wipe','transition','Luminance-based gradient wipe transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'feather',name:'Feather',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uFeather'}),
param({id:'invert',name:'Invert',type:'boolean',value:false,defaultValue:false,uniform:'uInvert'}),
]),fragmentShader:FRAG,};
