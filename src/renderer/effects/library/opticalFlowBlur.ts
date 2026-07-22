import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uAmount;
uniform vec2 uFlowDir;
uniform float uSamples;
uniform float uExposure;
uniform vec2 uTexelSize;
varying vec2 vUv;

void main() {
  vec4 col = vec4(0.0);
  vec2 dir = normalize(uFlowDir) * uTexelSize;
  float halfSamples = floor(uSamples * 0.5);
  float total = 0.0;

  for (float i = -halfSamples; i <= halfSamples; i += 1.0) {
    float t = i / halfSamples;
    float w = exp(-t * t * 2.0) * uAmount;
    vec2 uv = vUv + dir * i * uAmount * 10.0;
    col += texture2D(uTexture, clamp(uv, 0.0, 1.0)) * w;
    total += w;
  }

  col /= max(total, 0.001);
  col.rgb *= uExposure;
  gl_FragColor = vec4(col.rgb, texture2D(uTexture, vUv).a);
}
`;

export const opticalFlowBlurEffect: EffectModule = {
  definition: def('opticalFlowBlur','Optical Flow Blur','blur','Motion blur along an optical flow direction',1,[
    param({id:'amount',name:'Amount',value:1.0,defaultValue:1.0,min:0,max:3,step:0.01,uniform:'uAmount'}),
    param({id:'flowDirx',name:'Flow X',value:1.0,defaultValue:1.0,min:-1,max:1,step:0.01,uniform:'uFlowDir.x'}),
    param({id:'flowDiry',name:'Flow Y',value:0.0,defaultValue:0.0,min:-1,max:1,step:0.01,uniform:'uFlowDir.y'}),
    param({id:'samples',name:'Samples',value:16,defaultValue:16,min:4,max:64,step:1,uniform:'uSamples'}),
    param({id:'exposure',name:'Exposure',value:1.0,defaultValue:1.0,min:0.5,max:2,step:0.01,uniform:'uExposure'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
