import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uAmount;
uniform float uAngle;
uniform vec2 uCenter;
uniform float uScale;
varying vec2 vUv;

void main() {
  vec2 dir = vUv - uCenter;
  float dist = length(dir);
  float a = atan(dir.y, dir.x);

  float warp = sin(a * 3.0 + dist * uScale * 10.0) * uAmount;

  vec2 warpR = dir * (1.0 + warp * 1.3) + uCenter;
  vec2 warpG = dir * (1.0 + warp * 0.7) + uCenter;

  vec4 c;
  c.r = texture2D(uTexture, clamp(warpR, 0.0, 1.0)).r;
  c.g = texture2D(uTexture, clamp(warpG, 0.0, 1.0)).g;
  c.b = texture2D(uTexture, clamp(dir + uCenter, 0.0, 1.0)).b;
  c.a = texture2D(uTexture, vUv).a;

  gl_FragColor = c;
}
`;

export const distortRGBEffect: EffectModule = {
  definition: def('distortRGB','Distort RGB','distort','RGB channel separation distortion',1,[
    param({id:'amount',name:'Amount',value:0.02,defaultValue:0.02,min:0,max:0.1,step:0.001,uniform:'uAmount'}),
    param({id:'angle',name:'Angle',value:0,defaultValue:0,min:0,max:6.2832,step:0.01,uniform:'uAngle'}),
    param({id:'centerx',name:'Center X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uCenter.x'}),
    param({id:'centery',name:'Center Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uCenter.y'}),
    param({id:'scale',name:'Scale',value:1.0,defaultValue:1.0,min:0.1,max:5,step:0.1,uniform:'uScale'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
