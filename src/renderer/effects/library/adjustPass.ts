/**
 * adjustPass — consolidated color-grading pass for the Adjust panel.
 *
 * Combines: Temp, Tint, Saturation, Exposure, Contrast, Highlights,
 * Shadows, Whites, Blacks, Brilliance, Sharpen, Clarity, Fade, Vignette.
 *
 * One shader, one draw call. Much faster than chaining 14 separate effects.
 * Integrated into the layer render pipeline so it applies before the
 * regular effects chain — same order Capcut/Premiere use.
 */
import * as THREE from 'three';

export const ADJUST_VERTEX_SHADER = `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ADJUST_FRAGMENT_SHADER = `
  precision highp float;
  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;

  // LUT 3D texture
  uniform sampler3D uLutTex;
  uniform float uLutSize;
  uniform float uLutEnabled;
  uniform float uLutIntensity;

  // Color knobs (each -1..1 or 0..1 normalized from -100..100 in UI)
  uniform float uTemp;
  uniform float uTint;
  uniform float uSaturation;
  uniform float uExposure;
  uniform float uContrast;
  uniform float uHighlights;
  uniform float uShadows;
  uniform float uWhites;
  uniform float uBlacks;
  uniform float uBrilliance;
  uniform float uSharpen;
  uniform float uClarity;
  uniform float uFade;
  uniform float uVignette;
  uniform float uVignetteFeather;

  // RGB ↔ HSL conversions
  vec3 rgb2hsl(vec3 c) {
    float mx = max(max(c.r, c.g), c.b);
    float mn = min(min(c.r, c.g), c.b);
    float h = 0.0, s = 0.0, l = (mx + mn) * 0.5;
    if (mx != mn) {
      float d = mx - mn;
      s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
      if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
      else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
      else h = (c.r - c.g) / d + 4.0;
      h /= 6.0;
    }
    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    if (s == 0.0) return vec3(l);
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(
      hue2rgb(p, q, h + 1.0/3.0),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1.0/3.0)
    );
  }

  // Luminance (perceptual)
  float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  // Soft threshold for highlight/shadow masking
  float softMask(float x, float center, float width) {
    return smoothstep(center - width, center + width, x);
  }

  void main() {
    vec4 srcColor = texture(tDiffuse, vUv);
    vec3 c = srcColor.rgb;

    // ── Exposure (multiplicative in linear) ──
    c *= pow(2.0, uExposure * 2.0);   // -1 = 4x darker, +1 = 4x brighter

    // ── Temp + Tint ──
    // Temp: warm shifts R+, B-; cool shifts R-, B+
    c.r += uTemp * 0.15;
    c.b -= uTemp * 0.15;
    // Tint: magenta shifts G-, R+B+; green shifts G+, R-B-
    c.g -= uTint * 0.15;
    c.r += uTint * 0.08;
    c.b += uTint * 0.08;

    // ── Whites & Blacks (curve endpoints) ──
    // Whites: pushes bright values further toward 1
    // Blacks: pushes dark values further toward 0
    if (uWhites != 0.0) {
      float lum = luminance(c);
      float mask = smoothstep(0.5, 1.0, lum);
      c += mask * uWhites * 0.4;
    }
    if (uBlacks != 0.0) {
      float lum = luminance(c);
      float mask = 1.0 - smoothstep(0.0, 0.5, lum);
      c -= mask * uBlacks * 0.4;
    }

    // ── Highlights & Shadows (tone curve on midtones+high / low) ──
    if (uHighlights != 0.0) {
      float lum = luminance(c);
      float mask = smoothstep(0.4, 0.9, lum);
      c += mask * uHighlights * 0.3;
    }
    if (uShadows != 0.0) {
      float lum = luminance(c);
      float mask = 1.0 - smoothstep(0.1, 0.6, lum);
      c += mask * uShadows * 0.3;
    }

    // ── Brilliance (highlight/shadow lift toward midtones) ──
    if (uBrilliance != 0.0) {
      float lum = luminance(c);
      // Push everything gently toward 0.5, weighted by distance from 0.5
      float dist = abs(lum - 0.5);
      c += (0.5 - lum) * dist * uBrilliance * 0.6;
    }

    // ── Contrast (pivot at midtone) ──
    if (uContrast != 0.0) {
      c = (c - 0.5) * (1.0 + uContrast) + 0.5;
    }

    // ── Saturation ──
    if (uSaturation != 0.0) {
      float lum = luminance(c);
      c = mix(vec3(lum), c, 1.0 + uSaturation);
    }

    // ── Fade (matte lift — subtracts from contrast + lifts blacks) ──
    if (uFade > 0.0) {
      c = mix(c, mix(vec3(0.15), c, 0.85), uFade);
      c += vec3(0.05) * uFade;
    }

    // ── Clarity (local contrast — approximated via 3x3 box unsharp) ──
    if (uClarity != 0.0) {
      vec2 texel = 1.0 / uResolution;
      vec3 blur = vec3(0.0);
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          blur += texture(tDiffuse, vUv + vec2(x, y) * texel * 3.0).rgb;
        }
      }
      blur /= 9.0;
      vec3 mid = mix(blur, c, 0.5);
      c += (c - mid) * uClarity * 1.2;
    }

    // ── Sharpen (unsharp mask) ──
    if (uSharpen > 0.0) {
      vec2 texel = 1.0 / uResolution;
      vec3 sum =
        texture(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb +
        texture(tDiffuse, vUv + vec2( texel.x, 0.0)).rgb +
        texture(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb +
        texture(tDiffuse, vUv + vec2(0.0,  texel.y)).rgb;
      vec3 avg = sum * 0.25;
      c += (c - avg) * uSharpen * 3.0;
    }

    // ── Vignette ──
    if (uVignette != 0.0) {
      vec2 pos = vUv - 0.5;
      float dist = length(pos * vec2(uResolution.x / uResolution.y, 1.0));
      float feather = mix(0.2, 1.0, uVignetteFeather);
      float mask = smoothstep(0.5 * feather, 1.0, dist);
      c *= 1.0 + mask * uVignette;
    }

    // ── LUT (3D lookup table) ──
    if (uLutEnabled > 0.5) {
      vec3 lutCoord = clamp(c, 0.0, 1.0);
      // Map from [0,1] to texel-center coordinates
      float scale = (uLutSize - 1.0) / uLutSize;
      float offset = 0.5 / uLutSize;
      lutCoord = lutCoord * scale + offset;
      vec3 lutColor = texture(uLutTex, lutCoord).rgb;
      c = mix(c, lutColor, uLutIntensity);
    }

    fragColor = vec4(clamp(c, 0.0, 1.0), srcColor.a);
  }
`;

export interface AdjustUniforms {
  temp: number;
  tint: number;
  saturation: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  brilliance: number;
  sharpen: number;
  clarity: number;
  fade: number;
  vignette: number;
  vignetteFeather: number;
  lutIntensity: number;
}

/** Normalize UI values (-100..100 or 0..100) to shader space (-1..1 or 0..1) */
export function normalizeAdjust(data: any): AdjustUniforms {
  return {
    temp:            (data?.temp ?? 0) / 100,
    tint:            (data?.tint ?? 0) / 100,
    saturation:      (data?.saturation ?? 0) / 100,
    exposure:        (data?.exposure ?? 0) / 100,
    contrast:        (data?.contrast ?? 0) / 100,
    highlights:      (data?.highlights ?? 0) / 100,
    shadows:         (data?.shadows ?? 0) / 100,
    whites:          (data?.whites ?? 0) / 100,
    blacks:          (data?.blacks ?? 0) / 100,
    brilliance:      (data?.brilliance ?? 0) / 100,
    sharpen:         Math.max(0, (data?.sharpen ?? 0)) / 100,
    clarity:         (data?.clarity ?? 0) / 100,
    fade:            Math.max(0, (data?.fade ?? 0)) / 100,
    vignette:        (data?.vignette ?? 0) / 100,
    vignetteFeather: Math.max(0, Math.min(1, (data?.vignetteFeather ?? 50) / 100)),
    lutIntensity:    Math.max(0, Math.min(1, (data?.lutIntensity ?? 100) / 100)),
  };
}

/**
 * Create a THREE.ShaderMaterial for the Adjust pass. One instance per layer.
 * Reuse the same material across frames — just update uniforms.
 */
export function createAdjustMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: ADJUST_VERTEX_SHADER,
    fragmentShader: ADJUST_FRAGMENT_SHADER,
    uniforms: {
      tDiffuse:         { value: null },
      uResolution:      { value: new THREE.Vector2(1920, 1080) },
      uTemp:            { value: 0 },
      uTint:            { value: 0 },
      uSaturation:      { value: 0 },
      uExposure:        { value: 0 },
      uContrast:        { value: 0 },
      uHighlights:      { value: 0 },
      uShadows:         { value: 0 },
      uWhites:          { value: 0 },
      uBlacks:          { value: 0 },
      uBrilliance:      { value: 0 },
      uSharpen:         { value: 0 },
      uClarity:         { value: 0 },
      uFade:            { value: 0 },
      uVignette:        { value: 0 },
      uVignetteFeather: { value: 0.5 },
      uLutTex:          { value: null },
      uLutSize:         { value: 17.0 },
      uLutEnabled:      { value: 0 },
      uLutIntensity:    { value: 1.0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

/** Update material uniforms from adjust data */
export function applyAdjustUniforms(
  material: THREE.ShaderMaterial,
  data: any,
  width: number,
  height: number,
): void {
  const u = normalizeAdjust(data);
  material.uniforms.uResolution.value.set(width, height);
  material.uniforms.uTemp.value = u.temp;
  material.uniforms.uTint.value = u.tint;
  material.uniforms.uSaturation.value = u.saturation;
  material.uniforms.uExposure.value = u.exposure;
  material.uniforms.uContrast.value = u.contrast;
  material.uniforms.uHighlights.value = u.highlights;
  material.uniforms.uShadows.value = u.shadows;
  material.uniforms.uWhites.value = u.whites;
  material.uniforms.uBlacks.value = u.blacks;
  material.uniforms.uBrilliance.value = u.brilliance;
  material.uniforms.uSharpen.value = u.sharpen;
  material.uniforms.uClarity.value = u.clarity;
  material.uniforms.uFade.value = u.fade;
  material.uniforms.uVignette.value = u.vignette;
  material.uniforms.uVignetteFeather.value = u.vignetteFeather;
  material.uniforms.uLutIntensity.value = u.lutIntensity;
}

/** True if any adjustment is non-zero — skip the pass entirely if false */
export function isAdjustActive(data: any): boolean {
  if (!data || data.enabled === false) return false;
  const fields = [
    'temp', 'tint', 'saturation', 'exposure', 'contrast',
    'highlights', 'shadows', 'whites', 'blacks', 'brilliance',
    'clarity', 'vignette',
  ];
  for (const f of fields) if ((data[f] ?? 0) !== 0) return true;
  if ((data.sharpen ?? 0) > 0) return true;
  if ((data.fade ?? 0) > 0) return true;
  // LUT is active if lutId is set to anything other than identity OR undefined
  const lutId = data.lutId ?? '__identity';
  if (lutId !== '__identity') return true;
  return false;
}