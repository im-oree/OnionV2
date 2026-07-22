import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uBlobSize;uniform float uFeather;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(uTexture,vUv);vec2 grid=vUv/max(uBlobSize*0.01,0.001);vec2 id=floor(grid);float r=hash(id);float dist=abs(r-uProgress);float alpha=smoothstep(uFeather*0.5,-uFeather*0.5,dist);gl_FragColor=vec4(c.rgb*alpha,c.a*alpha);}`;
export const blobsWipeEffect:EffectModule={definition:def('blobsWipe','Blobs Wipe','transition','Organic blob dissolve transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'blobSize',name:'Blob Size',value:20,defaultValue:20,min:2,max:100,step:1,uniform:'uBlobSize'}),
param({id:'feather',name:'Feather',value:0.2,defaultValue:0.2,min:0,max:1,step:0.01,uniform:'uFeather'}),
]),fragmentShader:FRAG,};
