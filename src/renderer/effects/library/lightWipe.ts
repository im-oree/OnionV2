import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uProgress;uniform float uAngle;uniform float uWidth;uniform vec3 uColor;uniform float uIntensity;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float rad=uAngle*3.14159/180.0;vec2 dir=vec2(cos(rad),sin(rad));float pos=dot(vUv-0.5,dir);float sweep=smoothstep(uProgress-0.5,uProgress+0.5,pos)-smoothstep(uProgress+0.5,uProgress+1.5,pos);float light=sweep*uWidth*uIntensity;vec3 col=c.rgb+uColor*light;float alpha=step(pos,uProgress);gl_FragColor=vec4(mix(c.rgb,col,alpha)*alpha,c.a*alpha);}`;
export const lightWipeEffect:EffectModule={definition:def('lightWipe','Light Wipe','transition','Light sweep wipe transition.',1,[
param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
param({id:'angle',name:'Angle',value:-45,defaultValue:-45,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'width',name:'Width',value:0.3,defaultValue:0.3,min:0.05,max:1,step:0.01,uniform:'uWidth'}),
param({id:'color',name:'Color',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uColor'}),
param({id:'intensity',name:'Intensity',value:1.5,defaultValue:1.5,min:0,max:5,step:0.1,uniform:'uIntensity'}),
]),fragmentShader:FRAG,};
