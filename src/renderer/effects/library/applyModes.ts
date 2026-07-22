import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uMode;uniform float uMix;uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float a=uOpacity;vec3 src=c.rgb;vec3 col=uColor;vec3 result;int m=int(uMode);if(m==0)result=src+col;else if(m==1)result=1.0-(1.0-src)*(1.0-col);else if(m==2)result=vec3(min(src.r,min(src.g,src.b)));else if(m==3)result=vec3(max(src.r,max(src.g,src.b)));else if(m==4)result=src*col;else if(m==5)result=vec3(min(src.r,col.r),min(src.g,col.g),min(src.b,col.b));else if(m==6)result=vec3(max(src.r,col.r),max(src.g,col.g),max(src.b,col.b));else result=src;gl_FragColor=vec4(mix(src,result,mix*a),c.a);}`;
export const applyModesEffect:EffectModule={definition:def('applyModes','Apply Modes','blend','Advanced blend modes - Add, Screen, Darken, Lighten, Multiply, etc.',1,[
param({id:'mode',name:'Mode',type:'select',value:0,defaultValue:0,options:[{label:'Add',value:0},{label:'Screen',value:1},{label:'Min',value:2},{label:'Max',value:3},{label:'Multiply',value:4},{label:'Darken',value:5},{label:'Lighten',value:6}],uniform:'uMode'}),
param({id:'color',name:'Color',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uColor'}),
param({id:'mix',name:'Mix',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uMix'}),
param({id:'opacity',name:'Opacity',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uOpacity'}),
]),fragmentShader:FRAG,};
