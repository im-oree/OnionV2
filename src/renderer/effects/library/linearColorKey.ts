import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec3 uKeyColor;uniform float uTolerance;uniform float uSoftness;uniform float uEdgeThin;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 diff=c.rgb-uKeyColor;float dist=length(diff);float inner=max(0.0,uTolerance-uSoftness);float alpha=smoothstep(inner,uTolerance,dist);alpha=mix(alpha,1.0-abs(1.0-alpha),uEdgeThin);gl_FragColor=vec4(c.rgb,alpha);}`;
export const linearColorKeyEffect:EffectModule={definition:def('linearColorKey','Linear Color Key','keying','Simple RGB color keying with tolerance and softness.',1,[
param({id:'color',name:'Key Color',type:'color',value:'#00ff00',defaultValue:'#00ff00',uniform:'uKeyColor'}),
param({id:'tolerance',name:'Tolerance',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uTolerance'}),
param({id:'softness',name:'Softness',value:0.05,defaultValue:0.05,min:0,max:1,step:0.01,uniform:'uSoftness'}),
param({id:'edgeThin',name:'Edge Thin',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uEdgeThin'}),
]),fragmentShader:FRAG,};
