import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uTL,uTR,uBL,uBR;varying vec2 vUv;vec2 bilerp(vec2 a,vec2 b,vec2 c,vec2 d,float x,float y){vec2 top=mix(a,b,x);vec2 bot=mix(c,d,x);return mix(top,bot,y);}void main(){vec2 uv=bilerp(uTL,uTR,uBL,uBR,vUv.x,vUv.y);gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccPowerPinEffect:EffectModule={definition:def('ccPowerPin','CC Power Pin','distort','Perspective corner pin with four-corner warping.',1,[
param({id:'tlX',name:'Top-Left X',value:0,defaultValue:0,min:-0.5,max:1.5,step:0.005,uniform:'uTLX'}),
param({id:'tlY',name:'Top-Left Y',value:0,defaultValue:0,min:-0.5,max:1.5,step:0.005,uniform:'uTLY'}),
param({id:'trX',name:'Top-Right X',value:1,defaultValue:1,min:-0.5,max:1.5,step:0.005,uniform:'uTRX'}),
param({id:'trY',name:'Top-Right Y',value:0,defaultValue:0,min:-0.5,max:1.5,step:0.005,uniform:'uTRY'}),
param({id:'blX',name:'Bottom-Left X',value:0,defaultValue:0,min:-0.5,max:1.5,step:0.005,uniform:'uBLX'}),
param({id:'blY',name:'Bottom-Left Y',value:1,defaultValue:1,min:-0.5,max:1.5,step:0.005,uniform:'uBLY'}),
param({id:'brX',name:'Bottom-Right X',value:1,defaultValue:1,min:-0.5,max:1.5,step:0.005,uniform:'uBRX'}),
param({id:'brY',name:'Bottom-Right Y',value:1,defaultValue:1,min:-0.5,max:1.5,step:0.005,uniform:'uBRY'}),
]),fragmentShader:FRAG,};
