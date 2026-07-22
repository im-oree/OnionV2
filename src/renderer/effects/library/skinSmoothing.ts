import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uAmount;
uniform float uRadius;
uniform float uSkinThreshold;
uniform vec2 uTexelSize;
varying vec2 vUv;

vec3 rgb2yuv(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  float u = dot(c, vec3(-0.147, -0.289, 0.436));
  float v = dot(c, vec3(0.615, -0.515, -0.100));
  return vec3(y, u, v);
}

float skinMask(vec3 c) {
  vec3 yuv = rgb2yuv(c);
  float uShift = yuv.y + 0.1;
  float vShift = yuv.z;
  float skin = 1.0 - smoothstep(0.0, uSkinThreshold, abs(uShift));
  skin *= 1.0 - smoothstep(0.0, uSkinThreshold, abs(vShift - 0.15));
  return skin;
}

void main() {
  vec4 c = texture2D(uTexture, vUv);
  float skin = skinMask(c.rgb);
  if (skin < 0.01) {
    gl_FragColor = c;
    return;
  }

  vec4 blur = vec4(0.0);
  float total = 0.0;
  int r = int(ceil(uRadius));
  for (int dy = -r; dy <= r; dy++) {
    for (int dx = -r; dx <= r; dx++) {
      vec2 off = vec2(float(dx), float(dy)) * uTexelSize;
      float w = exp(-float(dx*dx + dy*dy) / (2.0 * uRadius * uRadius));
      blur += texture2D(uTexture, vUv + off) * w;
      total += w;
    }
  }
  blur /= total;

  float a = skin * uAmount;
  gl_FragColor = vec4(mix(c.rgb, blur.rgb, a), c.a);
}
`;

export const skinSmoothingEffect: EffectModule = {
  definition: def('skinSmoothing','Skin Smoothing','stylize','Skin smoothing with automatic skin detection',1,[
    param({id:'amount',name:'Amount',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uAmount'}),
    param({id:'radius',name:'Radius',value:2.0,defaultValue:2.0,min:0.5,max:10,step:0.1,uniform:'uRadius'}),
    param({id:'skinThreshold',name:'Skin Threshold',value:0.15,defaultValue:0.15,min:0.01,max:0.5,step:0.01,uniform:'uSkinThreshold'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
