import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uRadius;
uniform vec2 uTexelSize;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);

  vec4 sum = vec4(0.0);
  vec4 sumW = vec4(0.0);
  vec4 median[9];
  int idx = 0;

  int r = int(ceil(uRadius));
  for (int dy = -r; dy <= r; dy++) {
    for (int dx = -r; dx <= r; dx++) {
      vec2 off = vec2(float(dx), float(dy)) * uTexelSize;
      vec4 s = texture2D(uTexture, vUv + off);
      if (idx < 9) median[idx] = s;
      idx++;
      float w = exp(-float(dx*dx + dy*dy) / (2.0 * uRadius * uRadius));
      sum += s * w;
      sumW += w;
    }
  }

  // Simple median of 3x3 neighborhood
  for (int i = 0; i < 5; i++) {
    for (int j = i + 1; j < 9; j++) {
      if (median[i].r > median[j].r) {
        vec4 t = median[i]; median[i] = median[j]; median[j] = t;
      }
    }
  }

  vec4 medianVal = median[4];
  vec4 blurVal = sum / max(sumW, 0.001);

  float diff = length(c.rgb - medianVal.rgb);
  float mask = smoothstep(uThreshold * 0.5, uThreshold, diff);

  vec4 result = mix(medianVal, blurVal, 0.5);
  gl_FragColor = vec4(mix(c.rgb, result.rgb, mask), c.a);
}
`;

export const scratchRemovalEffect: EffectModule = {
  definition: def('scratchRemoval','Scratch Removal','stylize','Removes scratches and dust spots using median blending',1,[
    param({id:'threshold',name:'Threshold',value:0.1,defaultValue:0.1,min:0.01,max:0.5,step:0.01,uniform:'uThreshold'}),
    param({id:'radius',name:'Radius',value:1.5,defaultValue:1.5,min:0.5,max:5,step:0.1,uniform:'uRadius'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
