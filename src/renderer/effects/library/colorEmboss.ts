import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uResolution;uniform float uAngle;uniform float uDepth;uniform float uBlend;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad))/uResolution;vec4 a=texture2D(uTexture,clamp(vUv+dir*3.0,0.0,1.0));vec4 b=texture2D(uTexture,clamp(vUv-dir*3.0,0.0,1.0));vec3 emboss=(c.rgb-a.rgb)*uDepth*0.5+0.5;vec3 result=mix(c.rgb,emboss,uBlend);gl_FragColor=vec4(result,c.a);}`;
export const colorEmbossEffect:EffectModule={definition:def('colorEmboss','Color Emboss','stylize','Emboss effect that preserves original colors.',1,[
param({id:'angle',name:'Angle',value:45,defaultValue:45,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'depth',name:'Depth',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uDepth'}),
param({id:'blend',name:'Blend',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
