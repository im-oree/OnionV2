import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uBrickWidth;
uniform float uBrickHeight;
uniform float uMortarWidth;
uniform vec3 uBrickColor;
uniform vec3 uMortarColor;
uniform float uBlendOriginal;
uniform float uBevel;
varying vec2 vUv;

void main() {
  vec4 orig = texture2D(uTexture, vUv);
  vec2 brickSize = vec2(uBrickWidth, uBrickHeight);
  vec2 mortar = vec2(uMortarWidth);

  vec2 pos = vUv / brickSize;
  vec2 grid = floor(pos);
  vec2 local = pos - grid;

  // Offset every other row
  float rowOffset = mod(grid.y, 2.0) * 0.5;
  local.x = fract(local.x + rowOffset);

  vec2 brickLocal = local / (1.0 - mortar / brickSize);
  vec2 ml = local * brickSize;

  float mortarMask = 0.0;
  if (ml.x < mortar.x || ml.x > brickSize.x - mortar.x) mortarMask = 1.0;
  if (ml.y < mortar.y || ml.y > brickSize.y - mortar.y) mortarMask = 1.0;

  // Bevel on brick edges
  float bx = 1.0 - smoothstep(0.0, uBevel, ml.x) * smoothstep(0.0, uBevel, brickSize.x - ml.x);
  float by = 1.0 - smoothstep(0.0, uBevel, ml.y) * smoothstep(0.0, uBevel, brickSize.y - ml.y);
  float bevelLight = 0.7 + 0.3 * (1.0 - max(bx, by));

  float hash = fract(sin(dot(grid + 1.0, vec2(127.1, 311.7))) * 43758.5453);
  vec3 brickShade = uBrickColor * (0.85 + 0.15 * hash);

  vec3 col = mix(brickShade * bevelLight, uMortarColor, mortarMask);

  col = mix(orig.rgb, col, uBlendOriginal);

  gl_FragColor = vec4(col, orig.a);
}
`;

export const brickEffect: EffectModule = {
  definition: def('brick','Brick','generate','Procedural brick wall texture for compositing',1,[
    param({id:'brickWidth',name:'Brick Width',value:0.2,defaultValue:0.2,min:0.05,max:0.5,step:0.01,uniform:'uBrickWidth'}),
    param({id:'brickHeight',name:'Brick Height',value:0.1,defaultValue:0.1,min:0.03,max:0.3,step:0.01,uniform:'uBrickHeight'}),
    param({id:'mortarWidth',name:'Mortar Width',value:0.005,defaultValue:0.005,min:0.001,max:0.05,step:0.001,uniform:'uMortarWidth'}),
    param({id:'brickColorr',name:'Brick Color R',value:0.7,defaultValue:0.7,min:0,max:1,step:0.01,uniform:'uBrickColor.r'}),
    param({id:'brickColorg',name:'Brick Color G',value:0.2,defaultValue:0.2,min:0,max:1,step:0.01,uniform:'uBrickColor.g'}),
    param({id:'brickColorb',name:'Brick Color B',value:0.15,defaultValue:0.15,min:0,max:1,step:0.01,uniform:'uBrickColor.b'}),
    param({id:'mortarColorr',name:'Mortar R',value:0.7,defaultValue:0.7,min:0,max:1,step:0.01,uniform:'uMortarColor.r'}),
    param({id:'mortarColorg',name:'Mortar G',value:0.7,defaultValue:0.7,min:0,max:1,step:0.01,uniform:'uMortarColor.g'}),
    param({id:'mortarColorb',name:'Mortar B',value:0.7,defaultValue:0.7,min:0,max:1,step:0.01,uniform:'uMortarColor.b'}),
    param({id:'blendOriginal',name:'Blend Original',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uBlendOriginal'}),
    param({id:'bevel',name:'Bevel',value:0.05,defaultValue:0.05,min:0,max:0.2,step:0.01,uniform:'uBevel'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
