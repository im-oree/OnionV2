import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uLevels;uniform float uEdgeStrength;uniform vec2 uResolution;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec3 poster=floor(c.rgb*uLevels)/uLevels;vec2 off=1.0/uResolution;float e=0.0;e+=length(texture2D(uTexture,vUv+vec2(off.x,0.0)).rgb-c.rgb);e+=length(texture2D(uTexture,vUv+vec2(0.0,off.y)).rgb-c.rgb);e=clamp(e*5.0,0.0,1.0);vec3 result=mix(poster,vec3(0.0),e*uEdgeStrength);gl_FragColor=vec4(result,c.a);}`;
export const artistsPosterEffect:EffectModule={definition:def('artistsPoster','Artists Poster','stylize','Posterize with edge enhancement for illustrated look.',1,[
param({id:'levels',name:'Levels',value:6,defaultValue:6,min:2,max:32,step:1,uniform:'uLevels'}),
param({id:'edgeStrength',name:'Edge Strength',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uEdgeStrength'}),
]),fragmentShader:FRAG,};
