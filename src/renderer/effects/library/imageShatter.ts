import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;
uniform float uProgress;
uniform float uShardSize;
uniform float uRandomSeed;

uniform float uBurstX;
uniform float uBurstY;
uniform float uBurstForce;
uniform float uDirectionality;

uniform float uGravity;
uniform float uSpin;
uniform float uSpread;
uniform float uDepth;

uniform float uLightX;
uniform float uLightY;
uniform float uLightZ;
uniform float uLightStrength;
uniform float uAmbient;

uniform float uEdgeDark;
uniform float uEdgeWidth;
uniform vec3  uEdgeColor;

uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uShardScale;

uniform float uAutoAnimate;
uniform float uAnimSpeed;

uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

float hash1(vec2 p) {
  return fract(sin(dot(p + uRandomSeed, vec2(127.1, 311.7))) * 43758.5453);
}
vec2 hash2(vec2 p) {
  return fract(sin(vec2(
    dot(p + uRandomSeed, vec2(127.1, 311.7)),
    dot(p + uRandomSeed, vec2(269.5, 183.3))
  )) * 43758.5453) - 0.5;
}

// Rotate a 2D point around origin
vec2 rot2(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c) * p;
}

// Voronoi cell centers - returns cell id and local coords within the cell
// Returns vec4(cellCenterX, cellCenterY, distToCenter, cellId)
vec4 voronoiCell(vec2 p, float cellScale) {
  vec2 grid = p / cellScale;
  vec2 baseCell = floor(grid);
  vec2 minCenter = vec2(0.0);
  float minDist = 1e6;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neigh = baseCell + vec2(float(i), float(j));
      vec2 offset = hash2(neigh * 1.71);
      vec2 center = (neigh + 0.5 + offset * 0.7);
      float d = distance(grid, center);
      if (d < minDist) {
        minDist = d;
        minCenter = center;
      }
    }
  }

  return vec4(minCenter * cellScale, minDist, hash1(minCenter * 3.7));
}

struct Cfg {
  float shardSize;
  float burstForce;
  float directionality;
  float gravity;
  float spin;
  float spread;
  float depth;
  float lightStrength;
  float ambient;
  float edgeDark;
  float edgeWidth;
  vec3  edgeColor;
  float fadeStart;
  float fadeEnd;
  float shardScale;
  int   pattern;  // 0 grid, 1 voronoi, 2 triangular
};

Cfg presetGlassBreak() {
  return Cfg(0.08, 1.0, 0.3, 0.6, 2.0, 0.5, 0.3, 0.7, 0.3, 0.6, 0.06, vec3(0.7, 0.85, 1.0), 0.6, 0.95, 0.9, 1);
}
Cfg presetExplosion() {
  return Cfg(0.06, 2.5, 1.0, 0.2, 4.0, 1.0, 0.5, 0.9, 0.2, 0.4, 0.04, vec3(1.0, 0.5, 0.2), 0.5, 0.95, 0.8, 0);
}
Cfg presetGentleFall() {
  return Cfg(0.12, 0.3, 0.1, 1.0, 0.5, 0.3, 0.15, 0.6, 0.4, 0.4, 0.05, vec3(0.5), 0.7, 0.98, 1.0, 0);
}
Cfg presetPaperTear() {
  return Cfg(0.15, 0.5, 0.5, 0.4, 1.0, 0.4, 0.1, 0.5, 0.5, 0.3, 0.03, vec3(0.4, 0.35, 0.3), 0.75, 0.98, 0.95, 2);
}
Cfg presetPixelDisintegrate() {
  return Cfg(0.03, 1.2, 0.7, 0.3, 3.0, 0.8, 0.2, 0.5, 0.4, 0.2, 0.02, vec3(0.5), 0.4, 0.9, 0.7, 0);
}
Cfg presetGigaChunks() {
  return Cfg(0.25, 0.8, 0.4, 0.7, 1.5, 0.6, 0.4, 0.7, 0.35, 0.5, 0.06, vec3(0.3), 0.65, 0.98, 0.95, 1);
}
Cfg presetCustom() {
  return Cfg(uShardSize, uBurstForce, uDirectionality, uGravity, uSpin, uSpread, uDepth,
             uLightStrength, uAmbient, uEdgeDark, uEdgeWidth, uEdgeColor,
             uFadeStart, uFadeEnd, uShardScale, 0);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetGlassBreak();
  if (s == 1) return presetExplosion();
  if (s == 2) return presetGentleFall();
  if (s == 3) return presetPaperTear();
  if (s == 4) return presetPixelDisintegrate();
  if (s == 5) return presetGigaChunks();
  return presetCustom();
}

void main() {
  vec4 srcOrig = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  // Resolve progress (auto or manual)
  float progress = uProgress;
  if (uAutoAnimate > 0.5) {
    progress = fract(uTime * uAnimSpeed * 0.2);
  }
  progress = clamp(progress, 0.0, 1.0);

  if (progress < 0.001) {
    gl_FragColor = srcOrig;
    return;
  }

  float aspect = uResolution.x / uResolution.y;

  // ---- Determine cell id + center based on pattern ----
  vec2 cellCenter;
  float cellId;
  int pattern = cfg.pattern;
  if (pattern == 1) {
    // Voronoi
    vec4 v = voronoiCell(vUv, cfg.shardSize);
    cellCenter = v.xy;
    cellId = v.w;
  } else if (pattern == 2) {
    // Triangular strip pattern - grid rows offset alternately
    vec2 grid = vUv / cfg.shardSize;
    float row = floor(grid.y);
    grid.x += mod(row, 2.0) * 0.5;
    vec2 baseCell = floor(grid);
    cellCenter = (baseCell + 0.5) * cfg.shardSize;
    cellCenter.x -= mod(floor(cellCenter.y / cfg.shardSize), 2.0) * cfg.shardSize * 0.5;
    cellId = hash1(baseCell * 1.31);
  } else {
    // Grid
    vec2 grid = floor(vUv / cfg.shardSize);
    cellCenter = (grid + 0.5) * cfg.shardSize;
    cellId = hash1(grid * 1.31);
  }

  // ---- Per-shard timing: some shards break earlier than others ----
  float delay = cellId * 0.4;
  float duration = 0.6 + hash1(vec2(cellId, 7.3)) * 0.4;
  float t = clamp((progress - delay) / duration, 0.0, 1.0);
  float ease = t * t * (3.0 - 2.0 * t);

  // ---- Movement: direction depends on burst mode ----
  vec2 burstPos = vec2(uBurstX, uBurstY);
  vec2 fromBurst = cellCenter - burstPos;
  float distFromBurst = length(fromBurst) + 1e-4;
  vec2 burstDir = fromBurst / distFromBurst;

  // Random per-shard direction
  vec2 randDir = normalize(hash2(vec2(cellId, 11.7)) + vec2(0.01));
  // Blend burst direction with random direction
  vec2 flyDir = normalize(mix(randDir, burstDir, cfg.directionality));

  // Distance falloff from burst - closer shards fly faster
  float burstStrength = mix(1.0, 1.0 / (1.0 + distFromBurst * 2.0), cfg.directionality * 0.5);

  // Position offset (2D + gravity applied to Y)
  vec2 shardOffset = flyDir * ease * cfg.burstForce * 0.4 * burstStrength;
  shardOffset.y += ease * ease * cfg.gravity * 0.5;   // gravity accelerates
  shardOffset += hash2(vec2(cellId, 23.7)) * ease * cfg.spread * 0.15;

  // Rotation
  float shardRot = (hash1(vec2(cellId, 41.3)) - 0.5) * cfg.spin * ease * 3.0;

  // Fake Z depth for shading
  float shardZ = (hash1(vec2(cellId, 53.7)) - 0.5) * cfg.depth * ease;

  // Shard scale (shards shrink slightly as they fly for depth cue)
  float shardScale = mix(1.0, cfg.shardScale, ease);

  // ---- Compute the UV to sample INSIDE the shard ----
  // Undo the shard's transform to find what part of the source it holds
  vec2 rel = vUv - cellCenter - shardOffset;
  // Un-scale
  rel /= max(shardScale, 0.01);
  // Un-rotate
  rel = rot2(rel, -shardRot);
  vec2 sampleUv = cellCenter + rel;

  // Check if this pixel actually belongs to the shard's original cell area
  vec2 localInShard;
  bool insideShard = true;

  if (pattern == 1) {
    // For voronoi, check that we're still closer to this shard's center than others
    vec4 v = voronoiCell(sampleUv, cfg.shardSize);
    if (distance(v.xy, cellCenter) > cfg.shardSize * 0.2) {
      insideShard = false;
    }
    localInShard = fract(sampleUv / cfg.shardSize);
  } else {
    localInShard = fract(sampleUv / cfg.shardSize);
    vec2 cellCheck = floor(sampleUv / cfg.shardSize);
    vec2 origCell = floor(cellCenter / cfg.shardSize);
    if (distance(cellCheck, origCell) > 0.5) {
      insideShard = false;
    }
  }

  // Sample the source at the un-transformed UV
  vec4 col;
  if (insideShard && sampleUv.x >= 0.0 && sampleUv.x <= 1.0 && sampleUv.y >= 0.0 && sampleUv.y <= 1.0) {
    col = texture2D(uTexture, sampleUv);
  } else {
    // Not part of this shard - transparent
    col = vec4(0.0);
  }

  // ---- Lighting based on shard normal + Z ----
  vec3 lightDir = normalize(vec3(uLightX, uLightY, uLightZ));
  // Fake normal per shard: slight random tilt
  vec2 nTilt = hash2(vec2(cellId, 61.7)) * cfg.depth;
  vec3 normal = normalize(vec3(nTilt.x * ease, nTilt.y * ease, 1.0 - ease * 0.3));
  float diffuse = max(dot(normal, lightDir), 0.0);
  float shade = cfg.ambient + diffuse * cfg.lightStrength;
  col.rgb *= shade;

  // ---- Edge darkening / colored rim ----
  float edgeDx = min(localInShard.x, 1.0 - localInShard.x);
  float edgeDy = min(localInShard.y, 1.0 - localInShard.y);
  float edgeDist = min(edgeDx, edgeDy);
  float edgeMask = 1.0 - smoothstep(0.0, cfg.edgeWidth, edgeDist);
  edgeMask *= cfg.edgeDark * (0.3 + 0.7 * ease);
  col.rgb = mix(col.rgb, cfg.edgeColor, edgeMask);

  // ---- Depth-based dimming: shards that flew "backward" get dimmer ----
  if (shardZ < 0.0) {
    col.rgb *= 1.0 + shardZ * 0.5;
  } else {
    col.rgb *= 1.0 - shardZ * 0.2;
  }

  // ---- Fade out shard alpha over time ----
  float alphaFade = 1.0 - smoothstep(cfg.fadeStart, cfg.fadeEnd, ease);
  col.a *= alphaFade;

  // If shard isn't part of this cell area (moved away), leave transparent
  if (!insideShard) {
    col = vec4(0.0);
  }

  // Mix with original for the "Mix" slider
  vec4 result = mix(srcOrig, col, clamp(uMix, 0.0, 1.0));
  gl_FragColor = result;
}
`;

export const imageShatterEffect: EffectModule = {
  definition: def(
    'imageShatter',
    '3D Image Shatter',
    'distort',
    'Breaks footage into flying 3D shards with 6 shatter styles and physics.',
    1,
    [
      // ===== STYLE SWITCHER =====
      param({ id: 'style', name: 'Shatter Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Glass Break',        value: 0 },
          { label: 'Explosion',          value: 1 },
          { label: 'Gentle Fall',        value: 2 },
          { label: 'Paper Tear',         value: 3 },
          { label: 'Pixel Disintegrate', value: 4 },
          { label: 'Giga Chunks',        value: 5 },
          { label: 'Custom',             value: 6 },
        ], uniform: 'uStyle' }),

      // ===== PROGRESS =====
      param({ id: 'progress',   name: 'Progress',      value: 0, defaultValue: 0, min: 0, max: 1, step: 0.001, uniform: 'uProgress' }),
      param({ id: 'autoAnimate', name: 'Auto Animate', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoAnimate' }),
      param({ id: 'animSpeed',   name: 'Auto Speed',   value: 1.0, defaultValue: 1.0, min: 0.1, max: 5, step: 0.05, uniform: 'uAnimSpeed' }),
      param({ id: 'randomSeed',  name: 'Random Seed',  value: 1.0, defaultValue: 1.0, min: 0, max: 100, step: 0.1, uniform: 'uRandomSeed' }),

      // ===== BURST ORIGIN =====
      param({ id: 'burstX',         name: 'Burst Origin X',       value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uBurstX' }),
      param({ id: 'burstY',         name: 'Burst Origin Y',       value: 0.5, defaultValue: 0.5, min: -0.5, max: 1.5, step: 0.001, uniform: 'uBurstY' }),
      param({ id: 'directionality', name: 'Burst Directionality', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uDirectionality' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),

      // ===== CUSTOM: Shard Shape =====
      param({ id: 'shardSize',  name: 'Custom: Shard Size',  value: 0.08, defaultValue: 0.08, min: 0.02, max: 0.5, step: 0.005, uniform: 'uShardSize' }),
      param({ id: 'shardScale', name: 'Custom: Final Scale', value: 0.9,  defaultValue: 0.9,  min: 0.1, max: 1.5, step: 0.01, uniform: 'uShardScale' }),

      // ===== CUSTOM: Physics =====
      param({ id: 'burstForce', name: 'Custom: Burst Force', value: 1.0, defaultValue: 1.0, min: 0, max: 4, step: 0.05, uniform: 'uBurstForce' }),
      param({ id: 'gravity',    name: 'Custom: Gravity',     value: 0.6, defaultValue: 0.6, min: -2, max: 2, step: 0.05, uniform: 'uGravity' }),
      param({ id: 'spin',       name: 'Custom: Spin',        value: 2.0, defaultValue: 2.0, min: 0, max: 6, step: 0.1, uniform: 'uSpin' }),
      param({ id: 'spread',     name: 'Custom: Random Spread', value: 0.5, defaultValue: 0.5, min: 0, max: 2, step: 0.05, uniform: 'uSpread' }),
      param({ id: 'depth',      name: 'Custom: Depth (fake Z)', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uDepth' }),

      // ===== CUSTOM: Lighting =====
      param({ id: 'lightX',        name: 'Custom: Light X', value: 0.5,  defaultValue: 0.5,  min: -1, max: 1, step: 0.01, uniform: 'uLightX' }),
      param({ id: 'lightY',        name: 'Custom: Light Y', value: -0.3, defaultValue: -0.3, min: -1, max: 1, step: 0.01, uniform: 'uLightY' }),
      param({ id: 'lightZ',        name: 'Custom: Light Z', value: 1.0,  defaultValue: 1.0,  min: -1, max: 1, step: 0.01, uniform: 'uLightZ' }),
      param({ id: 'lightStrength', name: 'Custom: Light Strength', value: 0.7, defaultValue: 0.7, min: 0, max: 2, step: 0.05, uniform: 'uLightStrength' }),
      param({ id: 'ambient',       name: 'Custom: Ambient',        value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uAmbient' }),

      // ===== CUSTOM: Edges =====
      param({ id: 'edgeDark',  name: 'Custom: Edge Darkness', value: 0.6,  defaultValue: 0.6,  min: 0, max: 1, step: 0.01, uniform: 'uEdgeDark' }),
      param({ id: 'edgeWidth', name: 'Custom: Edge Width',    value: 0.06, defaultValue: 0.06, min: 0, max: 0.3, step: 0.005, uniform: 'uEdgeWidth' }),
      param({ id: 'edgeColor', name: 'Custom: Edge Color',    type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uEdgeColor' }),

      // ===== CUSTOM: Fade =====
      param({ id: 'fadeStart', name: 'Custom: Fade Start', value: 0.6,  defaultValue: 0.6,  min: 0, max: 1, step: 0.01, uniform: 'uFadeStart' }),
      param({ id: 'fadeEnd',   name: 'Custom: Fade End',   value: 0.95, defaultValue: 0.95, min: 0, max: 1, step: 0.01, uniform: 'uFadeEnd' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};