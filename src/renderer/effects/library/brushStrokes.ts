import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uSize;uniform float uAngle;uniform float uIntensity;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad));vec2 perp=vec2(-dir.y,dir.x);float t=dot(vUv,perp)/max(uSize*0.01,0.001);float brush=abs(sin(t*3.14159));vec3 result=mix(c.rgb,c.rgb*brush,uIntensity);gl_FragColor=vec4(result,c.a);}`;
export const brushStrokesEffect:EffectModule={definition:def('brushStrokes','Brush Strokes','stylize','Painterly brush stroke effect.',1,[
param({id:'size',name:'Stroke Size',value:20,defaultValue:20,min:1,max:100,step:1,uniform:'uSize'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'intensity',name:'Intensity',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uIntensity'}),
]),fragmentShader:FRAG,};
