import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uRadius;uniform float uThreshold;uniform float uBlend;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float sigma=max(uRadius,0.5);vec3 sum=vec3(0.0);float tot=0.0;for(int y=-3;y<=3;y++){for(int x=-3;x<=3;x++){float d=length(vec2(float(x),float(y)));if(d>3.0)continue;float w=exp(-0.5*d*d/(sigma*sigma));vec2 uv=clamp(vUv+vec2(float(x),float(y))*0.003,0.0,1.0);vec3 s=texture2D(uTexture,uv).rgb;float w2=1.0-smoothstep(0.0,uThreshold,length(s-c.rgb));sum+=s*w*w2;tot+=w*w2;}}vec3 filtered=sum/max(tot,0.001);gl_FragColor=vec4(mix(c.rgb,filtered,uBlend),c.a);}`;
export const denoiseEffect:EffectModule={definition:def('denoise','De-noise','stylize','Simple bilateral-ish noise reduction filter.',1,[
param({id:'radius',name:'Radius',value:2,defaultValue:2,min:0.5,max:10,step:0.5,uniform:'uRadius'}),
param({id:'threshold',name:'Threshold',value:0.1,defaultValue:0.1,min:0,max:1,step:0.01,uniform:'uThreshold'}),
param({id:'blend',name:'Blend',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
