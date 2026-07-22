import * as THREE from 'three';
import type { EffectModule } from './types';
import { def, param } from './types';

const RADIAL_BLUR = `precision highp float;uniform sampler2D uTexture;uniform vec2 uResolution;uniform vec2 uCenter;uniform float uAmount;uniform float uAngle;uniform float uZoom;varying vec2 vUv;void main(){vec2 dir=vUv-uCenter;float dist=length(dir);vec2 norm=dist>0.001?normalize(dir):vec2(0.0);float rotAngle=uAngle*dist*3.14159;float c=cos(rotAngle),s=sin(rotAngle);vec3 col=vec3(0.0);float tot=0.0;int steps=32;for(int i=0;i<32;i++){float fi=float(i);float t=(fi/float(steps)-0.5)*uAmount;vec2 off=vec2(norm.x*c-norm.y*s,norm.x*s+norm.y*c)*t+norm*t*uZoom;vec2 uv=clamp(vUv+off,0.0,1.0);col+=texture2D(uTexture,uv).rgb;tot+=1.0;}gl_FragColor=vec4(col/tot,texture2D(uTexture,vUv).a);}`;

export const ccRadialBlurEffect: EffectModule = {
  definition: def('ccRadialBlur','CC Radial Blur','blurSharpen','Zoom/spin radial blur from a center point.',1,[
    param({id:'centerX',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterX'}),
    param({id:'centerY',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.005,uniform:'uCenterY'}),
    param({id:'amount',name:'Amount',value:0.05,defaultValue:0.05,min:0,max:0.5,step:0.005,uniform:'uAmount'}),
    param({id:'angle',name:'Spin Angle',value:0,defaultValue:0,min:-180,max:180,step:1,uniform:'uAngle'}),
    param({id:'zoom',name:'Zoom',value:0,defaultValue:0,min:-50,max:50,step:1,uniform:'uZoom'}),
  ]),fragmentShader:undefined as any,
  customRender:(ctx)=>{const{instance,readTexture,writeTarget,width,height,getMaterial,renderPass}=ctx;const g=(id:string)=>instance.parameters.find(p=>p.id===id)?.value;const m=getMaterial('rb',RADIAL_BLUR,{uCenter:{value:new THREE.Vector2(g('centerX')as number??0.5,g('centerY')as number??0.5)},uAmount:{value:(g('amount')as number)??0.05},uAngle:{value:(g('angle')as number)??0},uZoom:{value:(g('zoom')as number)??0}});m.uniforms.uTexture.value=readTexture;m.uniforms.uResolution.value.set(width,height);renderPass(m,writeTarget);},
};
