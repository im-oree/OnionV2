import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uProgress;
uniform float uShakeAmount;
uniform float uSeed;
varying vec2 vUv;

float rand(vec2 p) {
  return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float shake = (1.0 - abs(uProgress - 0.5) * 2.0) * uShakeAmount;
  vec2 shakeOffset = vec2(
    (rand(vec2(0.0, uProgress)) - 0.5) * shake,
    (rand(vec2(1.0, uProgress)) - 0.5) * shake
  ) * 0.1;

  vec2 uv = vUv + shakeOffset;
  vec4 c = texture2D(uTexture, clamp(uv, 0.0, 1.0));

  float noise = rand(floor(vUv * 20.0 + 10.0));
  float mask = step(noise, uProgress);

  gl_FragColor = vec4(c.rgb, c.a * (1.0 - mask));
}
`;

export const dissolveShakeEffect: EffectModule = {
  definition: def('dissolveShake','Dissolve Shake','transition','Dissolve transition with camera shake',1,[
    param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
    param({id:'shakeAmount',name:'Shake',value:0.5,defaultValue:0.5,min:0,max:2,step:0.01,uniform:'uShakeAmount'}),
    param({id:'seed',name:'Seed',value:1.0,defaultValue:1.0,min:0,max:10,step:0.1,uniform:'uSeed'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
