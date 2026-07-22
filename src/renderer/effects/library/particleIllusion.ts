import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `precision highp float;
uniform sampler2D uTexture;
uniform float uRate;
uniform float uLife;
uniform float uSize;
uniform float uSpeed;
uniform vec3 uColor;
uniform vec2 uOrigin;
uniform float uSpread;
uniform float uGravity;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 c = texture2D(uTexture, vUv);
  vec3 acc = vec3(0.0);

  int numParticles = 64;
  for (int i = 0; i < 64; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi + 0.5, uRate);
    float h = hash(seed);
    float h2 = hash(seed + 10.0);
    float h3 = hash(seed + 20.0);

    float birth = h * (1.0 / uRate);
    float death = birth + uLife * (0.5 + 0.5 * h2);
    float age = uTime - birth;

    if (age > 0.0 && age < death) {
      float life = age / death;
      vec2 dir = vec2(cos(h * 6.2832), sin(h * 6.2832)) * uSpread;
      float dist = life * uSpeed * (0.5 + 0.5 * h3) + 0.5 * uGravity * life * life;
      vec2 pos = uOrigin + dir * dist;
      vec2 particleUv = (vUv - pos) / max(uSize * 0.1, 0.001);
      float pd = length(particleUv);
      float alpha = exp(-pd * pd * 4.0) * (1.0 - life) * uRate;
      alpha = clamp(alpha, 0.0, 1.0);
      acc += uColor * alpha * (1.0 / float(numParticles));
    }
  }

  gl_FragColor = vec4(c.rgb + acc, c.a);
}
`;

export const particleIllusionEffect: EffectModule = {
  definition: def('particleIllusion','Particle Illusion','generate','GPU particle system with emitters (fire, smoke, sparks)',1,[
    param({id:'rate',name:'Rate',value:0.8,defaultValue:0.8,min:0.1,max:2,step:0.01,uniform:'uRate'}),
    param({id:'life',name:'Life',value:2.0,defaultValue:2.0,min:0.5,max:5,step:0.1,uniform:'uLife'}),
    param({id:'size',name:'Size',value:0.2,defaultValue:0.2,min:0.05,max:1,step:0.01,uniform:'uSize'}),
    param({id:'speed',name:'Speed',value:0.5,defaultValue:0.5,min:0,max:2,step:0.01,uniform:'uSpeed'}),
    param({id:'colorr',name:'Color R',value:1.0,defaultValue:1.0,min:0,max:1,step:0.01,uniform:'uColor.r'}),
    param({id:'colorg',name:'Color G',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uColor.g'}),
    param({id:'colorb',name:'Color B',value:0.2,defaultValue:0.2,min:0,max:1,step:0.01,uniform:'uColor.b'}),
    param({id:'originx',name:'Origin X',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uOrigin.x'}),
    param({id:'originy',name:'Origin Y',value:0.5,defaultValue:0.5,min:0,max:1,step:0.01,uniform:'uOrigin.y'}),
    param({id:'spread',name:'Spread',value:0.2,defaultValue:0.2,min:0.02,max:0.5,step:0.01,uniform:'uSpread'}),
    param({id:'gravity',name:'Gravity',value:0.1,defaultValue:0.1,min:-1,max:1,step:0.01,uniform:'uGravity'}),
  ]),
fragmentShader: FRAG,
  usesTime: true,
};
