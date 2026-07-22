import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSplitH;uniform float uSplitV;uniform vec2 uCenter;varying vec2 vUv;void main(){vec2 uv=vUv;if(uv.x>uCenter.x)uv.x+=uSplitH*0.1;if(uv.x<uCenter.x)uv.x-=uSplitH*0.1;if(uv.y>uCenter.y)uv.y+=uSplitV*0.1;if(uv.y<uCenter.y)uv.y-=uSplitV*0.1;gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0));}`;
export const ccSplitEffect:EffectModule={definition:def('ccSplit','CC Split','distort','Independent horizontal and vertical split distortion.',1,[
param({id:'splitH',name:'Split Horizontal',value:0,defaultValue:0,min:-5,max:5,step:0.1,uniform:'uSplitH'}),
param({id:'splitV',name:'Split Vertical',value:0,defaultValue:0,min:-5,max:5,step:0.1,uniform:'uSplitV'}),
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
]),fragmentShader:FRAG,};
