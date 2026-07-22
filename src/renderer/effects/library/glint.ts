import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform vec2 uCenter;uniform float uIntensity;uniform float uSize;uniform float uThreshold;uniform float uPoints;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);float lum=dot(c.rgb,vec3(0.2126,0.7152,0.0722));float bright=smoothstep(uThreshold-0.05,uThreshold+0.05,lum);vec2 dir=vUv-uCenter;float dist=length(dir);float a=atan(dir.y,dir.x);float sparkle=0.0;float np=max(uPoints,2.0);for(int i=0;i<12;i++){float fi=float(i);if(fi>=np)break;float ang=a+fi*6.2832/np;float s=pow(abs(cos(ang*np*0.5)),8.0);sparkle=max(sparkle,s);}float fade=exp(-dist*dist/(uSize*0.01));float alpha=sparkle*fade*bright*uIntensity;vec3 col=mix(c.rgb,vec3(1.0),alpha*0.5);gl_FragColor=vec4(col+vec3(alpha*0.5),c.a);}`;
export const glintEffect:EffectModule={definition:def('glint','Glint','generate','Star-shaped sparkle on bright highlights.',1,[
param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
param({id:'intensity',name:'Intensity',value:1,defaultValue:1,min:0,max:5,step:0.1,uniform:'uIntensity'}),
param({id:'size',name:'Size',value:20,defaultValue:20,min:1,max:100,step:1,uniform:'uSize'}),
param({id:'threshold',name:'Threshold',value:0.7,defaultValue:0.7,min:0,max:1,step:0.01,uniform:'uThreshold'}),
param({id:'points',name:'Points',value:4,defaultValue:4,min:2,max:12,step:1,uniform:'uPoints'}),
]),fragmentShader:FRAG,};
