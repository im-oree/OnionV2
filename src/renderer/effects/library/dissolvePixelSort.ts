import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uProgress;
uniform float uSortStrength;
uniform float uSeed;
varying vec2 vUv;

float rand(vec2 p) {
  return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 c = texture2D(uTexture, vUv);

  float sorted = step(rand(floor(vUv * 40.0)), uProgress);
  float sortAmt = sorted * uSortStrength;

  vec2 sortDir = vec2(0.0, 0.0);
  if (sorted > 0.5) {
    vec2 gridPos = floor(vUv * 40.0);
    float gridHash = rand(gridPos);
    sortDir = vec2(cos(gridHash * 6.2832), sin(gridHash * 6.2832)) * sortAmt * 0.02;
  }

  vec2 uv = vUv + sortDir;
  vec4 col = texture2D(uTexture, clamp(uv, 0.0, 1.0));

  if (sorted > 0.5) {
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    col.rgb = mix(col.rgb, vec3(lum), sortAmt);
  }

  gl_FragColor = vec4(col.rgb, c.a * (1.0 - sorted));
}
`;

export const dissolvePixelSortEffect: EffectModule = {
  definition: def('dissolvePixelSort','Dissolve Pixel Sort','transition','Pixel sort style dissolve transition',1,[
    param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
    param({id:'sortStrength',name:'Sort Strength',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uSortStrength'}),
    param({id:'seed',name:'Seed',value:1.0,defaultValue:1.0,min:0,max:10,step:0.1,uniform:'uSeed'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
