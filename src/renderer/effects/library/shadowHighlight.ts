import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uShadowAmount;uniform float uShadowRadius;uniform float uHighlightAmount;uniform float uHighlightRadius;uniform float uMidContrast;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float shadows=smoothstep(0.5,0.0,lum)*uShadowAmount;float hl=smoothstep(0.5,1.0,lum)*uHighlightAmount;vec3 result=c.rgb+vec3(shadows*0.5)-vec3(hl*0.3);float mLum=dot(result,vec3(0.2126,0.7152,0.0722));result=mix(result,result+(mLum-0.5)*uMidContrast*0.5,abs(uMidContrast));gl_FragColor=vec4(clamp(result,0.0,1.0),c.a);}`;
export const shadowHighlightEffect:EffectModule={definition:def('shadowHighlight','Shadow/Highlight','color','Brighten shadows and darken highlights independently.',1,[
param({id:'shadowAmount',name:'Shadow Amount',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uShadowAmount'}),
param({id:'shadowRadius',name:'Shadow Radius',value:30,defaultValue:30,min:1,max:200,step:1,uniform:'uShadowRadius'}),
param({id:'highlightAmount',name:'Highlight Amount',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uHighlightAmount'}),
param({id:'highlightRadius',name:'Highlight Radius',value:30,defaultValue:30,min:1,max:200,step:1,uniform:'uHighlightRadius'}),
param({id:'midContrast',name:'Mid Contrast',value:0,defaultValue:0,min:-1,max:1,step:0.01,uniform:'uMidContrast'}),
]),fragmentShader:FRAG,};
