import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uOffsetX;
uniform float uOffsetY;
uniform float uRotation;
uniform float uScale;
uniform float uCrop;
varying vec2 vUv;

vec2 rotate(vec2 uv, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  vec2 centered = uv - 0.5;
  return vec2(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c
  ) + 0.5;
}

void main() {
  vec2 uv = vUv;
  uv -= 0.5;
  uv /= uScale;
  uv += 0.5;
  uv -= vec2(uOffsetX, uOffsetY);
  uv = rotate(uv, uRotation);

  vec2 clamped = clamp(uv, 0.0 + uCrop, 1.0 - uCrop);
  vec4 col = texture2D(uTexture, clamped);

  if (uv.x < uCrop || uv.x > 1.0 - uCrop || uv.y < uCrop || uv.y > 1.0 - uCrop) {
    col = vec4(0.0);
  }

  gl_FragColor = col;
}
`;

export const stabilizationEffect: EffectModule = {
  definition: def('stabilization','Stabilization','distort','Manual image stabilization with offset, rotation, and scale',1,[
    param({id:'offsetX',name:'Offset X',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.001,uniform:'uOffsetX'}),
    param({id:'offsetY',name:'Offset Y',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.001,uniform:'uOffsetY'}),
    param({id:'rotation',name:'Rotation',value:0,defaultValue:0,min:-0.5,max:0.5,step:0.001,uniform:'uRotation'}),
    param({id:'scale',name:'Scale',value:1.0,defaultValue:1.0,min:0.5,max:2.0,step:0.01,uniform:'uScale'}),
    param({id:'crop',name:'Crop',value:0.0,defaultValue:0.0,min:0,max:0.5,step:0.01,uniform:'uCrop'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
