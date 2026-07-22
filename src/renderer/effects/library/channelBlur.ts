
import type { EffectModule } from './types';
import { def, param } from './types';

const CHANNEL_BLUR_H = `precision highp float;uniform sampler2D uTexture;uniform vec2 uResolution;uniform float uBlurR;uniform float uBlurG;uniform float uBlurB;uniform float uBlurA;varying vec2 vUv;vec4 blurChannel(float radius,float coeff){if(radius<0.5)return texture2D(uTexture,vUv);float sigma=radius/3.0;vec4 col=vec4(0.0);float tot=0.0;for(int i=-16;i<=16;i++){float x=float(i);float w=exp(-0.5*x*x/(sigma*sigma));vec2 uv=clamp(vUv+vec2(x/uResolution.x,0.0)*coeff,0.0,1.0);col+=texture2D(uTexture,uv)*w;tot+=w;}return col/tot;}void main(){vec4 rh=blurChannel(uBlurR,1.0);vec4 gh=blurChannel(uBlurG,1.0);vec4 bh=blurChannel(uBlurB,1.0);vec4 ah=blurChannel(uBlurA,1.0);gl_FragColor=vec4(rh.r,gh.g,bh.b,ah.a);}`;
const CHANNEL_BLUR_V = `precision highp float;uniform sampler2D uTexture;uniform vec2 uResolution;uniform float uBlurR;uniform float uBlurG;uniform float uBlurB;uniform float uBlurA;varying vec2 vUv;vec4 blurChannel(float radius,float coeff){if(radius<0.5)return texture2D(uTexture,vUv);float sigma=radius/3.0;vec4 col=vec4(0.0);float tot=0.0;for(int i=-16;i<=16;i++){float y=float(i);float w=exp(-0.5*y*y/(sigma*sigma));vec2 uv=clamp(vUv+vec2(0.0,y/uResolution.y)*coeff,0.0,1.0);col+=texture2D(uTexture,uv)*w;tot+=w;}return col/tot;}void main(){vec4 rv=blurChannel(uBlurR,1.0);vec4 gv=blurChannel(uBlurG,1.0);vec4 bv=blurChannel(uBlurB,1.0);vec4 av=blurChannel(uBlurA,1.0);gl_FragColor=vec4(rv.r,gv.g,bv.b,av.a);}`;

export const channelBlurEffect: EffectModule = {
  definition: def('channelBlur','Channel Blur','blurSharpen','Blur each RGB channel independently with separate radii.',2,[
    param({id:'blurR',name:'Blur Red',value:0,defaultValue:0,min:0,max:50,step:0.5,uniform:'uBlurR'}),
    param({id:'blurG',name:'Blur Green',value:0,defaultValue:0,min:0,max:50,step:0.5,uniform:'uBlurG'}),
    param({id:'blurB',name:'Blur Blue',value:0,defaultValue:0,min:0,max:50,step:0.5,uniform:'uBlurB'}),
    param({id:'blurA',name:'Blur Alpha',value:0,defaultValue:0,min:0,max:50,step:0.5,uniform:'uBlurA'}),
  ]),fragmentShader:undefined as any,
  customRender:(ctx)=>{const{instance,readTexture,writeTarget,width,height,getMaterial,acquireScratch,renderPass}=ctx;const g=(id:string)=>instance.parameters.find(p=>p.id===id)?.value;const blurR=(g('blurR')as number)??0,blurG=(g('blurG')as number)??0,blurB=(g('blurB')as number)??0,blurA=(g('blurA')as number)??0;
    const m1=getMaterial('cbh',CHANNEL_BLUR_H,{uBlurR:{value:blurR},uBlurG:{value:blurG},uBlurB:{value:blurB},uBlurA:{value:blurA}});
    m1.uniforms.uTexture.value=readTexture;m1.uniforms.uResolution.value.set(width,height);
    const t1=acquireScratch(width,height);renderPass(m1,t1);
    const m2=getMaterial('cbv',CHANNEL_BLUR_V,{uBlurR:{value:blurR},uBlurG:{value:blurG},uBlurB:{value:blurB},uBlurA:{value:blurA}});
    m2.uniforms.uTexture.value=t1.texture;m2.uniforms.uResolution.value.set(width,height);renderPass(m2,writeTarget);},
};
