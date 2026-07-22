import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uProgress;
uniform float uGlitchAmount;
uniform float uSeed;
varying vec2 vUv;

float rand(vec2 p) {
  return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 c = texture2D(uTexture, vUv);

  float mask = rand(floor(vUv * 50.0));
  float dissolve = step(mask, uProgress);
  float mask2 = rand(floor(vUv * 30.0 + 1.0));
  float glitchStrip = step(1.0 - uGlitchAmount, mask2);

  vec2 uv = vUv;
  if (glitchStrip > 0.5 && dissolve < 0.5) {
    uv.x += (rand(vec2(vUv.y, 0.0)) - 0.5) * 0.1;
  }

  vec4 col = texture2D(uTexture, uv);
  if (dissolve > 0.5) {
    col = vec4(0.0);
  } else {
    if (glitchStrip > 0.5) {
      col.rgb *= 1.0 + (rand(vec2(vUv.y, 2.0)) - 0.5) * 0.3;
    }
  }

  gl_FragColor = vec4(col.rgb, c.a * (1.0 - dissolve));
}
`;

export const dissolveDigitalDamageEffect: EffectModule = {
  definition: def('dissolveDigitalDamage','Dissolve Digital Damage','transition','Digital damage style dissolve transition with glitch artifacts',1,[
    param({id:'progress',name:'Progress',value:0,defaultValue:0,min:0,max:1,step:0.01,uniform:'uProgress'}),
    param({id:'glitchAmount',name:'Glitch',value:0.3,defaultValue:0.3,min:0,max:1,step:0.01,uniform:'uGlitchAmount'}),
    param({id:'seed',name:'Seed',value:1.0,defaultValue:1.0,min:0,max:10,step:0.1,uniform:'uSeed'}),
  ]),
fragmentShader: FRAG,
  usesTime: false,
};
