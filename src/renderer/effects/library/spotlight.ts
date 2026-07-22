import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uAngle;uniform float uPenumbra;uniform float uIntensity;uniform vec3 uColor;uniform float uFeather;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 dir=vUv-uCenter;float rad=uAngle*3.14159/180.0;vec2 lightDir=vec2(cos(rad),sin(rad));vec2 perp=vec2(-lightDir.y,lightDir.x);float along=dot(dir,lightDir);float across=abs(dot(dir,perp));float cone=1.0-smoothstep(0.0,1.0,across/max(along*uPenumbra+0.001,0.001));float falloff=smoothstep(0.0,1.0,along)*smoothstep(1.0,0.8,along);float mask=cone*falloff;mask=smoothstep(uFeather*0.5,1.0-uFeather*0.5,mask);vec3 result=mix(c.rgb,c.rgb+uColor*mask*uIntensity,mask);gl_FragColor=vec4(result,c.a);}`;
export const spotlightEffect:EffectModule={definition:def('spotlight','Spotlight','generate','Procedural spotlight cone effect.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'angle',name:'Angle',value:-90,defaultValue:-90,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'penumbra',name:'Penumbra',value:0.3,defaultValue:0.3,min:0.01,max:1,step:0.01,uniform:'uPenumbra'}),
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:3,step:0.1,uniform:'uIntensity'}),
param({id:'color',name:'Color',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uColor'}),
param({id:'feather',name:'Feather',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uFeather'}),
]),fragmentShader:FRAG,};
