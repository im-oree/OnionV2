import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uColorLevels;
uniform float uEdgeStrength;
uniform float uSmoothness;
uniform vec2 uTexelSize;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);

  // Color quantization
  vec3 quant = floor(c.rgb * uColorLevels + 0.5) / uColorLevels;
  quant = mix(c.rgb, quant, uSmoothness);

  // Sobel edge detection
  vec2 tl = texture2D(uTexture, vUv + vec2(-1, -1) * uTexelSize).rgb;
  vec2 t  = texture2D(uTexture, vUv + vec2( 0, -1) * uTexelSize).rgb;
  vec2 tr = texture2D(uTexture, vUv + vec2( 1, -1) * uTexelSize).rgb;
  vec2 l  = texture2D(uTexture, vUv + vec2(-1,  0) * uTexelSize).rgb;
  vec2 r  = texture2D(uTexture, vUv + vec2( 1,  0) * uTexelSize).rgb;
  vec2 bl = texture2D(uTexture, vUv + vec2(-1,  1) * uTexelSize).rgb;
  vec2 b  = texture2D(uTexture, vUv + vec2( 0,  1) * uTexelSize).rgb;
  vec2 br = texture2D(uTexture, vUv + vec2( 1,  1) * uTexelSize).rgb;

  float gx = tl.x + 2.0*t.x + tr.x - bl.x - 2.0*b.x - br.x;
  float gy = tl.x + 2.0*l.x + bl.x - tr.x - 2.0*r.x - br.x;
  float edge = sqrt(gx*gx + gy*gy);

  float edgeMask = smoothstep(0.05, 0.2, edge) * uEdgeStrength;

  vec3 col = mix(quant, vec3(0.0), edgeMask * 0.5);
  gl_FragColor = vec4(col, c.a);
}
`;

export const cartoonLookEffect: EffectModule = {
  definition: def('cartoonLook','Cartoon Look','stylize','Cartoon-style posterization with edge outlines',1,[
    param({id:'colorLevels',name:'Color Levels',value:6.0,defaultValue:6.0,min:2,max:20,step:1,uniform:'uColorLevels'}),
    param({id:'edgeStrength',name:'Edge Strength',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uEdgeStrength'}),
    param({id:'smoothness',name:'Smoothness',value:0.8,defaultValue:0.8,min:0,max:1,step:0.01,uniform:'uSmoothness'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
