import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSpillColor;uniform float uDespillR;uniform float uDespillG;uniform float uDespillB;uniform float uTolerance;uniform float uSoftness;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float spill;if(uSpillColor<0.5){spill=max(0.0,c.g-c.r*0.5-c.b*0.5);}else{spill=max(0.0,c.b-c.r*0.5-c.g*0.5);}float mask=smoothstep(uTolerance*(1.0-uSoftness*0.5),uTolerance,spill);vec3 despill=vec3(uDespillR,uDespillG,uDespillB);vec3 result=c.rgb-despill*spill*mask;gl_FragColor=vec4(clamp(result,0.0,1.0),c.a);}`;
export const spillSuppressorEffect:EffectModule={definition:def('spillSuppressor','Spill Suppressor','keying','Remove green/blue spill from keyed footage.',1,[
param({id:'spillColor',name:'Spill Color',type:'select',value:0,defaultValue:0,options:[{label:'Green',value:0},{label:'Blue',value:1}],uniform:'uSpillColor'}),
param({id:'despillR',name:'Despill Red',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uDespillR'}),
param({id:'despillG',name:'Despill Green',value:0.0,defaultValue:0.0,min:0,max:1,step:0.01,uniform:'uDespillG'}),
param({id:'despillB',name:'Despill Blue',value:0.0,defaultValue:0.0,min:0,max:1,step:0.01,uniform:'uDespillB'}),
param({id:'tolerance',name:'Tolerance',value:0.2,defaultValue:0.2,min:0,max:1,step:0.01,uniform:'uTolerance'}),
param({id:'softness',name:'Softness',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uSoftness'}),
]),fragmentShader:FRAG,};
