import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uIntensity;uniform float uCount;uniform float uAngle;uniform vec3 uColor;uniform float uLength;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float bright=pow(lum,2.0);if(bright<0.1){gl_FragColor=c;return;}vec2 dir=vUv-uCenter;float dist=length(dir);float a=atan(dir.y,dir.x);float glare=0.0;for(int i=0;i<8;i++){float fi=float(i);float ang=a+uAngle*3.14159/180.0+fi*3.14159/max(uCount,1.0);vec2 d=vec2(cos(ang),sin(ang))*(1.0/400.0);float g=0.0;for(int j=0;j<20;j++){float fj=float(j);vec2 uv=clamp(vUv+d*fj*uLength*50.0,0.0,1.0);g+=dot(texture2D(uTexture,uv).rgb,vec3(0.2126,0.7152,0.0722))*exp(-fj/4.0);}glare=max(glare,g);}glare=glare/20.0*bright*uIntensity;gl_FragColor=vec4(c.rgb+glare*uColor,c.a);}`;
export const glareEffect:EffectModule={definition:def('glare','Glare','generate','Anamorphic glare streaks from bright areas.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uIntensity'}),
param({id:'count',name:'Streak Count',value:2,defaultValue:2,min:1,max:16,step:1,uniform:'uCount'}),
param({id:'angle',name:'Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
param({id:'length',name:'Length',value:0.5,defaultValue:0.5,min:0.1,max:3,step:0.1,uniform:'uLength'}),
param({id:'color',name:'Color',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uColor'}),
]),fragmentShader:FRAG,};
