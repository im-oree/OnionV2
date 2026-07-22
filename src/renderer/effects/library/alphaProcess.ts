import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uMode;uniform float uOpacity;uniform vec3 uBgColor;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 result=c.rgb;float a=c.a*uOpacity;if(uMode<0.5){}
else if(uMode<1.5){result=c.rgb*a+uBgColor*(1.0-a);}
else if(uMode<2.5){result=c.rgb/max(a,0.001);}
else if(uMode<3.5){result=c.rgb*a;}
gl_FragColor=vec4(result,a);}`;
export const alphaProcessEffect:EffectModule={definition:def('alphaProcess','Alpha Process','keying','Alpha manipulation - straight, premultiply, unmul, composite over bg.',1,[
param({id:'mode',name:'Mode',type:'select',value:0,defaultValue:0,options:[{label:'Straight',value:0},{label:'Composite Over BG',value:1},{label:'Un-Premultiply',value:2},{label:'Premultiply',value:3}],uniform:'uMode'}),
param({id:'opacity',name:'Opacity',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uOpacity'}),
param({id:'bgColor',name:'BG Color',type:'color',value:'#000000',defaultValue:'#000000',uniform:'uBgColor'}),
]),fragmentShader:FRAG,};
