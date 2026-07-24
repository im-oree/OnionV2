/**
 * cutoutShader — applies a segmentation mask to a layer's rendered
 * texture, with refine controls (feather, threshold, contract/expand,
 * smoothing) and optional stroke.
 */
import * as THREE from 'three';

export const CUTOUT_VERTEX_SHADER = `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const CUTOUT_FRAGMENT_SHADER = `
  precision highp float;
  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler2D tDiffuse;
  uniform sampler2D tMask;
  uniform vec2 uResolution;

  uniform float uFeather;       // 0..100 (px)
  uniform float uContract;      // -50..50 (px)
  uniform float uSmoothing;     // 0..1
  uniform float uThreshold;     // 0..1

  // Stroke
  uniform float uStrokeEnabled;
  uniform vec4 uStrokeColor;
  uniform float uStrokeWidth;   // px
  uniform float uStrokeSoftness;  // 0..1
  uniform float uStrokePosition;  // 0 = inside, 1 = outside, 2 = center
  uniform float uStrokeStyle;     // 0 = solid, 1 = glow

  // Chroma key
  uniform float uChromaEnabled;
  uniform vec3 uChromaKey;        // rgb 0..1
  uniform float uChromaSimilarity;// 0..1
  uniform float uChromaSmoothness;// 0..1
  uniform float uChromaSpill;     // 0..1

  // Convert sRGB to YCbCr (BT.601). Chroma keying works on Cb/Cr, not RGB.
  vec3 rgb2ycbcr(vec3 c) {
    float y  = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    float cb = -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b + 0.5;
    float cr = 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b + 0.5;
    return vec3(y, cb, cr);
  }

  /**
   * Compute chroma-key alpha for a given source color.
   * Returns (alpha, spillFactor):
   *   alpha       0 = fully keyed out, 1 = keep
   *   spillFactor 0..1 = how much the pixel resembles the key (for spill)
   */
  vec2 chromaKeyAlpha(vec3 src) {
    vec3 srcYCC = rgb2ycbcr(src);
    vec3 keyYCC = rgb2ycbcr(uChromaKey);
    vec2 dCC = srcYCC.yz - keyYCC.yz;
    float dist = length(dCC);
    // Similarity: smaller = tighter key (more transparent center)
    float base = uChromaSimilarity * 0.5;
    float ramp = uChromaSmoothness * 0.5 + 0.001;
    float alpha = smoothstep(base, base + ramp, dist);
    float spill = 1.0 - smoothstep(0.0, base + ramp, dist);
    return vec2(alpha, spill);
  }

  float sampleMask(vec2 uv) {
    return texture(tMask, uv).r;
  }

  float refinedMask(vec2 uv) {
    float m = sampleMask(uv);
    // Threshold — pixels below → 0, above → boosted
    m = smoothstep(uThreshold - 0.15, uThreshold + 0.15, m);

    // Smoothing — 3x3 box blur weighted by strength
    if (uSmoothing > 0.001) {
      vec2 texel = 1.0 / uResolution;
      float sum = 0.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          sum += sampleMask(uv + vec2(x, y) * texel);
        }
      }
      float avg = sum / 9.0;
      m = mix(m, avg, uSmoothing);
    }

    // Contract / expand — dilate (expand) or erode (contract) the mask
    // by uContract pixels using an 8-tap ring at increasing radii.
    if (abs(uContract) > 0.5) {
      vec2 texel = 1.0 / uResolution;
      float amt = min(abs(uContract), 50.0);
      bool expand = uContract > 0.0;
      // Start from current value; expand takes max of neighbors, contract takes min
      float acc = m;
      const int RINGS = 3;
      for (int i = 1; i <= RINGS; i++) {
        float r = amt * (float(i) / float(RINGS));
        float s1 = sampleMask(uv + texel * vec2( r, 0.0));
        float s2 = sampleMask(uv + texel * vec2(-r, 0.0));
        float s3 = sampleMask(uv + texel * vec2(0.0,  r));
        float s4 = sampleMask(uv + texel * vec2(0.0, -r));
        float s5 = sampleMask(uv + texel * vec2( r*0.707,  r*0.707));
        float s6 = sampleMask(uv + texel * vec2(-r*0.707,  r*0.707));
        float s7 = sampleMask(uv + texel * vec2( r*0.707, -r*0.707));
        float s8 = sampleMask(uv + texel * vec2(-r*0.707, -r*0.707));
        if (expand) {
          acc = max(acc, max(max(max(s1, s2), max(s3, s4)),
                             max(max(s5, s6), max(s7, s8))));
        } else {
          acc = min(acc, min(min(min(s1, s2), min(s3, s4)),
                             min(min(s5, s6), min(s7, s8))));
        }
      }
      m = acc;
    }

    return clamp(m, 0.0, 1.0);
  }

  void main() {
    vec4 src = texture(tDiffuse, vUv);

    // ── Chroma key pre-pass ────────────────────────────────
    float chromaAlpha = 1.0;
    if (uChromaEnabled > 0.5) {
      vec2 ck = chromaKeyAlpha(src.rgb);
      chromaAlpha = ck.x;
      // Spill suppression: desaturate the key color out of the pixel
      if (uChromaSpill > 0.001 && ck.y > 0.0) {
        float spillAmount = ck.y * uChromaSpill;
        // Push pixel away from key color by spillAmount
        vec3 desaturated = mix(src.rgb, vec3(dot(src.rgb, vec3(0.299, 0.587, 0.114))), spillAmount);
        src.rgb = mix(src.rgb, desaturated, spillAmount);
      }
    }

    float m = refinedMask(vUv);
    // Combine with chroma alpha — both must "want" the pixel to keep it
    m *= chromaAlpha;

    // Feather — expand the mask boundary with a soft alpha ramp
    if (uFeather > 0.5) {
      vec2 texel = 1.0 / uResolution;
      float radius = uFeather;
      float sum = 0.0;
      int samples = 6;
      for (int i = 0; i < 6; i++) {
        float t = (float(i) + 0.5) / 6.0;
        float r = radius * t;
        sum += sampleMask(vUv + texel * vec2(r, 0.0));
        sum += sampleMask(vUv + texel * vec2(-r, 0.0));
        sum += sampleMask(vUv + texel * vec2(0.0, r));
        sum += sampleMask(vUv + texel * vec2(0.0, -r));
      }
      float ring = sum / 24.0;
      m = mix(m, ring, 0.4);
    }

    vec3 outColor = src.rgb;
    float outAlpha = src.a * m;

    // Stroke — find nearest mask edge and draw a colored ring around it
    if (uStrokeEnabled > 0.5 && uStrokeWidth > 0.5) {
      vec2 texel = 1.0 / uResolution;
      float maxRadius = uStrokeWidth;
      // Search 8 rings * 8 directions = 64 taps. Find nearest edge distance.
      float minDist = maxRadius + 1.0;
      // Ring 1
      {
        float r = maxRadius * 0.125;
        if (abs(sampleMask(vUv + texel*vec2( r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0, r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0,-r)) - m) > 0.3) minDist = min(minDist, r);
      }
      // Ring 2
      {
        float r = maxRadius * 0.375;
        if (abs(sampleMask(vUv + texel*vec2( r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0, r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0,-r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2( r*0.7, r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r*0.7, r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2( r*0.7,-r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r*0.7,-r*0.7)) - m) > 0.3) minDist = min(minDist, r);
      }
      // Ring 3
      {
        float r = maxRadius * 0.625;
        if (abs(sampleMask(vUv + texel*vec2( r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0, r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0,-r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2( r*0.7, r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r*0.7, r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2( r*0.7,-r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r*0.7,-r*0.7)) - m) > 0.3) minDist = min(minDist, r);
      }
      // Ring 4 (outer)
      {
        float r = maxRadius * 0.875;
        if (abs(sampleMask(vUv + texel*vec2( r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r,0.0)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0, r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(0.0,-r)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2( r*0.7, r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r*0.7, r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2( r*0.7,-r*0.7)) - m) > 0.3) minDist = min(minDist, r);
        if (abs(sampleMask(vUv + texel*vec2(-r*0.7,-r*0.7)) - m) > 0.3) minDist = min(minDist, r);
      }

      if (minDist < maxRadius) {
        float dist01 = minDist / maxRadius;
        // Softness controls how quickly the stroke fades near its outer edge
        float soft = clamp(uStrokeSoftness, 0.0, 1.0);
        float strokeAlpha = 1.0 - smoothstep(max(0.0, 1.0 - soft), 1.0, dist01);

        // Position filter: only paint stroke where appropriate
        bool showStroke = false;
        if (uStrokePosition < 0.5 && m > 0.5) showStroke = true;        // inside
        else if (uStrokePosition > 0.5 && uStrokePosition < 1.5 && m < 0.5) showStroke = true;   // outside
        else if (uStrokePosition > 1.5) showStroke = true;              // center (both sides)

        if (showStroke) {
          float finalStroke = strokeAlpha * uStrokeColor.a;
          if (uStrokeStyle > 0.5) {
            // Glow — additive-feeling, softer
            finalStroke *= 0.7;
          }
          outColor = mix(outColor, uStrokeColor.rgb, finalStroke);
          outAlpha = max(outAlpha, finalStroke);
        }
      }
    }

    fragColor = vec4(outColor, outAlpha);
  }
`;

export function createCutoutMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: CUTOUT_VERTEX_SHADER,
    fragmentShader: CUTOUT_FRAGMENT_SHADER,
    uniforms: {
      tDiffuse: { value: null },
      tMask: { value: null },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
      uFeather: { value: 0 },
      uContract: { value: 0 },
      uSmoothing: { value: 0 },
      uThreshold: { value: 0.5 },
      uStrokeEnabled: { value: 0 },
      uStrokeColor: { value: new THREE.Vector4(1, 1, 1, 1) },
      uStrokeWidth: { value: 0 },
      uStrokeSoftness: { value: 0 },
      uStrokePosition: { value: 1 },
      uStrokeStyle: { value: 0 },
      // Chroma key
      uChromaEnabled: { value: 0 },
      uChromaKey: { value: new THREE.Vector3(0, 1, 0) },
      uChromaSimilarity: { value: 0.4 },
      uChromaSmoothness: { value: 0.2 },
      uChromaSpill: { value: 0.3 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

/** Upload a grayscale mask (Uint8Array) as a texture */
export function createMaskTexture(
  data: Uint8Array, width: number, height: number,
): THREE.DataTexture {
  // Pad to RGBA for wider driver support
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < data.length; i++, j += 4) {
    rgba[j + 0] = data[i];
    rgba[j + 1] = data[i];
    rgba[j + 2] = data[i];
    rgba[j + 3] = 255;
  }
  const tex = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}