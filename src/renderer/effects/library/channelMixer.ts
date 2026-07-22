import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uRR,uRG,uRB;uniform float uGR,uGG,uGB;uniform float uBR,uBG,uBB;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 r=vec3(c.r*uRR+c.g*uRG+c.b*uRB);vec3 g=vec3(c.r*uGR+c.g*uGG+c.b*uGB);vec3 b=vec3(c.r*uBR+c.g*uBG+c.b*uBB);gl_FragColor=vec4(clamp(vec3(r.x,g.y,b.z),0.0,1.0),c.a);}`;
export const channelMixerEffect:EffectModule={definition:def('channelMixer','Channel Mixer','color','Mix RGB channels independently.',1,[
param({id:'rr',name:'Red-Red',value:1,defaultValue:1,min:-2,max:2,step:0.01,uniform:'uRR'}),
param({id:'rg',name:'Red-Green',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uRG'}),
param({id:'rb',name:'Red-Blue',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uRB'}),
param({id:'gr',name:'Green-Red',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uGR'}),
param({id:'gg',name:'Green-Green',value:1,defaultValue:1,min:-2,max:2,step:0.01,uniform:'uGG'}),
param({id:'gb',name:'Green-Blue',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uGB'}),
param({id:'br',name:'Blue-Red',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uBR'}),
param({id:'bg',name:'Blue-Green',value:0,defaultValue:0,min:-2,max:2,step:0.01,uniform:'uBG'}),
param({id:'bb',name:'Blue-Blue',value:1,defaultValue:1,min:-2,max:2,step:0.01,uniform:'uBB'}),
]),fragmentShader:FRAG,};
