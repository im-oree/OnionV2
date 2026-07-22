import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uScaleH;uniform float uScaleV;uniform float uOffsetX;uniform float uOffsetY;uniform float uBlend;varying vec2 vUv;void main(){vec2 uv=fract(vUv*vec2(uScaleH,uScaleV)+vec2(uOffsetX,uOffsetY));vec4 tiled=texture2D(uTexture,uv);vec4 orig=texture2D(uTexture,vUv);gl_FragColor=mix(orig,tiled,uBlend);}`;
export const ccTilerEffect:EffectModule={definition:def('ccTiler','CC Tiler','distort','Tile repeat distortion with offset control.',1,[
param({id:'scaleH',name:'Scale Horizontal',value:2,defaultValue:2,min:0.5,max:10,step:0.1,uniform:'uScaleH'}),
param({id:'scaleV',name:'Scale Vertical',value:2,defaultValue:2,min:0.5,max:10,step:0.1,uniform:'uScaleV'}),
param({id:'offsetX',name:'Offset X',value:0,defaultValue:0,min:-5,max:5,step:0.1,uniform:'uOffsetX'}),
param({id:'offsetY',name:'Offset Y',value:0,defaultValue:0,min:-5,max:5,step:0.1,uniform:'uOffsetY'}),
param({id:'blend',name:'Blend Original',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
