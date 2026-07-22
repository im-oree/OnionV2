import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform vec3 uKeyColor;
uniform float uTolerance;
uniform float uSoftness;
uniform float uEdgeThin;
uniform float uDespill;
uniform vec2 uTexelSize;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);

  vec3 k = uKeyColor / max(uKeyColor.r + uKeyColor.g + uKeyColor.b, 0.001);
  vec3 col = c.rgb / max(c.r + c.g + c.b, 0.001);

  float diff = distance(col, k);
  float alpha = smoothstep(uTolerance - uSoftness * 0.5, uTolerance + uSoftness * 0.5, diff);
  alpha = 1.0 - alpha;

  // Edge thin: sample neighbors
  float edgeAlpha = alpha;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      vec4 s = texture2D(uTexture, vUv + vec2(float(dx), float(dy)) * uTexelSize);
      vec3 sk = s.rgb / max(s.r + s.g + s.b, 0.001);
      float sd = distance(sk, k);
      float sa = 1.0 - smoothstep(uTolerance - uSoftness * 0.5, uTolerance + uSoftness * 0.5, sd);
      if (sa > 0.5) edgeAlpha = sa;
    }
  }
  edgeAlpha = mix(alpha, edgeAlpha, uEdgeThin);

  // Spill suppression
  float spill = (1.0 - alpha) * uDespill;
  vec3 despilled = c.rgb - k * spill * 0.3;

  gl_FragColor = vec4(despilled, edgeAlpha);
}
`;

export const primatteKeyEffect: EffectModule = {
  definition: def('primatteKey','Primatte Key','keying','Advanced chroma keying with spill suppression and edge refinement',1,[
    param({id:'keyColorr',name:'Key Color R',value:0.0,defaultValue:0.0,min:0,max:1,step:0.01,uniform:'uKeyColor.r'}),
    param({id:'keyColorg',name:'Key Color G',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uKeyColor.g'}),
    param({id:'keyColorb',name:'Key Color B',value:0.0,defaultValue:0.0,min:0,max:1,step:0.01,uniform:'uKeyColor.b'}),
    param({id:'tolerance',name:'Tolerance',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uTolerance'}),
    param({id:'softness',name:'Softness',value:0.1,defaultValue:0.1,min:0,max:0.5,step:0.01,uniform:'uSoftness'}),
    param({id:'edgeThin',name:'Edge Thin',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uEdgeThin'}),
    param({id:'despill',name:'Despill',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uDespill'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
