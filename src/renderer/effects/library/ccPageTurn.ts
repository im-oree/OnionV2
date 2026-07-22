import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = String.raw`
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uStyle;
uniform float uProgress;
uniform float uCornerMode;
uniform float uFoldAngleDeg;
uniform float uCurlRadius;

uniform vec3  uPaperColor;
uniform vec3  uBackColor;
uniform float uBackOpacity;
uniform float uBackTint;

uniform float uLightDirDeg;
uniform float uShadowStrength;
uniform float uShadowSize;
uniform float uSheenStrength;
uniform vec3  uSheenColor;

uniform float uAutoAnimate;
uniform float uAnimSpeed;
uniform float uMix;

varying vec2 vUv;

const float PI = 3.14159265;

struct Cfg {
  float curlRadius;
  vec3  paperColor;
  vec3  backColor;
  float backOpacity;
  float backTint;
  float shadowStrength;
  float shadowSize;
  vec3  sheenColor;
  float sheenStrength;
};

Cfg presetBook() {
  return Cfg(0.10, vec3(0.98, 0.96, 0.9), vec3(0.95, 0.92, 0.82), 0.9, 0.2,
             0.55, 0.15, vec3(1.0, 0.98, 0.92), 0.7);
}
Cfg presetGlossy() {
  return Cfg(0.08, vec3(1.0), vec3(1.0), 0.95, 0.05,
             0.5, 0.12, vec3(1.0), 1.2);
}
Cfg presetNewspaper() {
  return Cfg(0.14, vec3(0.9, 0.87, 0.78), vec3(0.85, 0.82, 0.72), 0.85, 0.3,
             0.4, 0.2, vec3(1.0, 0.95, 0.85), 0.35);
}
Cfg presetCardstock() {
  return Cfg(0.06, vec3(0.96), vec3(0.94), 1.0, 0.1,
             0.65, 0.1, vec3(1.0), 0.9);
}
Cfg presetMetalFoil() {
  return Cfg(0.08, vec3(0.85, 0.86, 0.9), vec3(0.9, 0.85, 0.55), 1.0, 0.6,
             0.6, 0.12, vec3(1.0, 1.0, 1.1), 1.6);
}
Cfg presetTissue() {
  return Cfg(0.20, vec3(1.0, 0.98, 0.98), vec3(1.0, 0.97, 0.97), 0.7, 0.15,
             0.35, 0.25, vec3(1.0, 0.97, 0.95), 0.3);
}
Cfg presetCustom() {
  return Cfg(uCurlRadius, uPaperColor, uBackColor, uBackOpacity, uBackTint,
             uShadowStrength, uShadowSize, uSheenColor, uSheenStrength);
}

Cfg pickPreset() {
  int s = int(uStyle + 0.5);
  if (s == 0) return presetBook();
  if (s == 1) return presetGlossy();
  if (s == 2) return presetNewspaper();
  if (s == 3) return presetCardstock();
  if (s == 4) return presetMetalFoil();
  if (s == 5) return presetTissue();
  return presetCustom();
}

void getCorner(out vec2 origin, out vec2 pullDir) {
  int m = int(uCornerMode + 0.5);
  if (m == 0)      { origin = vec2(1.0, 0.0); pullDir = normalize(vec2(-1.0,  1.0)); } // BR
  else if (m == 1) { origin = vec2(0.0, 0.0); pullDir = normalize(vec2( 1.0,  1.0)); } // BL
  else if (m == 2) { origin = vec2(1.0, 1.0); pullDir = normalize(vec2(-1.0, -1.0)); } // TR
  else if (m == 3) { origin = vec2(0.0, 1.0); pullDir = normalize(vec2( 1.0, -1.0)); } // TL
  else             { origin = vec2(1.0, 0.5); pullDir = normalize(vec2(-1.0,  0.0)); } // Right edge
}

void main() {
  vec4 srcOrig = texture2D(uTexture, vUv);
  Cfg cfg = pickPreset();

  float progress = uProgress;
  if (uAutoAnimate > 0.5) {
    progress = fract(uTime * uAnimSpeed * 0.15);
  }
  progress = clamp(progress, 0.0, 1.0);

  if (progress < 0.001) {
    gl_FragColor = srcOrig;
    return;
  }

  float aspect = uResolution.x / uResolution.y;
  vec2 uv = vUv;
  vec2 uvA = vec2(uv.x * aspect, uv.y);

  vec2 origin, autoPullDir;
  getCorner(origin, autoPullDir);
  vec2 originA = vec2(origin.x * aspect, origin.y);

  // Direction of the pull: user override or auto
  vec2 pullDir;
  if (uFoldAngleDeg < -998.0) {
    pullDir = autoPullDir;
  } else {
    float a = radians(uFoldAngleDeg);
    pullDir = vec2(cos(a), sin(a));
  }

  // The fold line is perpendicular to pullDir, and moves along pullDir
  // from origin as progress increases.
  vec2 foldTangent = vec2(-pullDir.y, pullDir.x);

  // Max diagonal distance to fully turn the page
  float maxDist = length(vec2(aspect, 1.0)) * 1.5;
  // The fold line's distance from origin along pullDir
  float foldDist = progress * maxDist;

  // Signed distance of this pixel from the fold line
  // Positive = on the still-flat side (away from origin)
  // Negative = on the peeled side (between origin and fold line, ~or peeled over)
  float distFromFold = dot(uvA - originA, pullDir) - foldDist;

  float R = max(cfg.curlRadius, 0.005);

  // ---- Precompute lighting ----
  float lightAng = radians(uLightDirDeg);
  vec2 lightDir = vec2(cos(lightAng), sin(lightAng));

  // Result color and alpha to compose
  vec3 outColor = srcOrig.rgb;

  // First: figure out if this pixel is showing:
  // A) the flat page (with possibly a cast shadow from the curled flap above)
  // B) the front side of the curled part
  // C) the back side of the peeled-over part

  // ---------- FLAT PAGE region (distFromFold > 0) ----------
  if (distFromFold > 0.0) {
    // This is the still-flat area. The curl casts a shadow onto it.
    // Shadow position: strongest just past the fold line, fades out
    float shadowDist = distFromFold;
    // Shadow shape: fake occlusion. The curl blocks light coming from lightDir.
    // Project the shadow along the light direction onto flat plane.
    // Simplified: the width of the shadow depends on how "up" the curl is (progress + light angle).
    float lightIntoPage = clamp(dot(lightDir, pullDir), -1.0, 1.0);
    float shadowReach = R * PI * (0.5 + 0.5 * lightIntoPage) + cfg.shadowSize * 0.3;
    float shadowSoft = 1.0 - smoothstep(0.0, shadowReach, shadowDist);
    float shadow = shadowSoft * cfg.shadowStrength * progress;
    outColor = srcOrig.rgb * (1.0 - shadow);
    gl_FragColor = mix(srcOrig, vec4(outColor, srcOrig.a), clamp(uMix, 0.0, 1.0));
    return;
  }

  // ---------- Below fold line: could be curled front, back-of-page, or empty ----------
  // Distance past the fold line (into curl territory), positive
  float d = -distFromFold;

  // The half-perimeter of the cylinder is PI * R. That's how far the paper
  // "arc-lengthwise" goes from fold line, through the top of the curl,
  // to the bottom of the curl / back side.
  float halfCirc = PI * R;

  if (d < halfCirc) {
    // ---- CURLED PART (front-face visible) ----
    // theta = 0 at fold line, PI at bottom of curl
    float theta = d / R;

    // Original UV of this piece of paper before it curled:
    // arc length from fold line = R * theta
    // In original flat coords, that point was at fold line + pullDir * (arc length)
    // But we're rendering where it CURRENTLY is (screen space uv).
    // We need to sample the source at where this piece WAS originally.

    // What screen X the original point had:
    // The fold line is at foldDist along pullDir from origin.
    // The original flat position is at foldDist + R*theta along pullDir from origin,
    // at the same tangential offset as our current pixel.
    float tangentialOffset = dot(uvA - originA, foldTangent);
    vec2 origPointA = originA + pullDir * (foldDist + R * theta) + foldTangent * tangentialOffset;
    vec2 origPoint = vec2(origPointA.x / aspect, origPointA.y);

    // Sample the front image
    vec3 col;
    if (origPoint.x >= 0.0 && origPoint.x <= 1.0 && origPoint.y >= 0.0 && origPoint.y <= 1.0) {
      col = texture2D(uTexture, origPoint).rgb;
    } else {
      col = cfg.paperColor;
    }

    // Lighting: normal on cylinder rotates from pointing at viewer (theta=0)
    // to pointing away (theta=PI). Compute Lambert with light direction.
    // The 2D projection of the normal in screen space along the pullDir axis:
    // n_along = cos(theta) initially points "up" (out of page), but for shading,
    // treat it as a 3D normal:
    // In the cylinder's local frame:
    //   axis = foldTangent (rotation axis)
    //   x = pullDir (was in-plane)
    //   z = up (out of page)
    // Point on cylinder: (R*sin(theta) in pullDir, 0 in foldTangent, R*cos(theta) in z from cylinder center)
    // Normal in world (approx flat lighting): direction from cylinder center = (sin(theta), 0, cos(theta)) in that frame
    vec3 n = vec3(sin(theta) * pullDir + cos(theta) * vec2(0.0, 0.0), cos(theta));
    // Simpler 3D normal: N = (sin(theta) * pullDir.xy, cos(theta))
    vec3 N = vec3(sin(theta) * pullDir, cos(theta));
    vec3 L = normalize(vec3(lightDir, 0.6));
    float diffuse = max(dot(N, L), 0.0);
    float shade = 0.35 + diffuse * 0.75;
    col *= shade;

    // Specular sheen at the curl's crest
    float spec = pow(max(dot(N, L), 0.0), 12.0);
    // Rim highlight at the peak
    float rim = smoothstep(0.85, 1.0, sin(theta));
    col += cfg.sheenColor * (spec + rim * 0.5) * cfg.sheenStrength;

    outColor = col;

  } else if (d < 2.0 * halfCirc) {
    // ---- BACK SIDE of the peeled portion ----
    // theta beyond PI means we're on the back face
    float theta = d / R;                     // > PI
    float thetaBack = theta - PI;             // 0..PI on the back

    // Original position of this back-facing piece:
    // arc length from fold line still = R * theta, but we're looking at back
    float tangentialOffset = dot(uvA - originA, foldTangent);
    vec2 origPointA = originA + pullDir * (foldDist + R * theta) + foldTangent * tangentialOffset;
    vec2 origPoint = vec2(origPointA.x / aspect, origPointA.y);

    vec3 col;
    // Mirror the sample horizontally along fold direction to represent back
    if (origPoint.x >= 0.0 && origPoint.x <= 1.0 && origPoint.y >= 0.0 && origPoint.y <= 1.0) {
      // Sample source and tint toward back color
      vec3 mirrored = texture2D(uTexture, origPoint).rgb;
      col = mix(cfg.backColor, mirrored, cfg.backOpacity * (1.0 - cfg.backTint));
    } else {
      col = cfg.backColor;
    }

    // Back-face shading (normal points opposite)
    vec3 N = vec3(-sin(theta) * pullDir, -cos(theta));
    vec3 L = normalize(vec3(lightDir, 0.6));
    float diffuse = max(dot(N, L), 0.0);
    float shade = 0.4 + diffuse * 0.6;
    col *= shade;

    // Subtle sheen on back too
    float spec = pow(diffuse, 8.0);
    col += cfg.sheenColor * spec * cfg.sheenStrength * 0.4;

    outColor = col;

  } else {
    // ---- Past the curled area: this pixel is now REVEALED background ----
    // The paper has been peeled AWAY, showing what's underneath.
    // Show the paper color (or transparent if you want composited).
    outColor = cfg.paperColor;

    // Cast the curl's shadow on this revealed area too
    float distPastCurl = d - 2.0 * halfCirc;
    float shadowSoft = exp(-distPastCurl / max(cfg.shadowSize, 0.001));
    float shadow = shadowSoft * cfg.shadowStrength * 0.5;
    outColor *= 1.0 - shadow;
  }

  outColor = clamp(outColor, 0.0, 1.5);
  gl_FragColor = mix(srcOrig, vec4(outColor, srcOrig.a), clamp(uMix, 0.0, 1.0));
}
`;

export const ccPageTurnEffect: EffectModule = {
  definition: def(
    'ccPageTurn',
    'CC Page Turn',
    'transition',
    'Realistic 3D page curl with true cylinder geometry, backside content and lighting.',
    1,
    [
      // ===== STYLE =====
      param({ id: 'style', name: 'Paper Style', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Book Page',       value: 0 },
          { label: 'Glossy Magazine', value: 1 },
          { label: 'Newspaper',       value: 2 },
          { label: 'Cardstock',       value: 3 },
          { label: 'Metal Foil',      value: 4 },
          { label: 'Tissue Soft',     value: 5 },
          { label: 'Custom',          value: 6 },
        ], uniform: 'uStyle' }),

      // ===== PROGRESS =====
      param({ id: 'progress',   name: 'Progress',      value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.001, uniform: 'uProgress' }),
      param({ id: 'autoAnimate', name: 'Auto Animate', type: 'boolean', value: false, defaultValue: false, uniform: 'uAutoAnimate' }),
      param({ id: 'animSpeed',   name: 'Auto Speed',   value: 1.0, defaultValue: 1.0, min: 0.1, max: 5, step: 0.05, uniform: 'uAnimSpeed' }),

      // ===== FOLD ORIGIN =====
      param({ id: 'cornerMode', name: 'Fold Origin', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'Bottom Right',           value: 0 },
          { label: 'Bottom Left',            value: 1 },
          { label: 'Top Right',              value: 2 },
          { label: 'Top Left',               value: 3 },
          { label: 'Right Edge (page flip)', value: 4 },
        ], uniform: 'uCornerMode' }),
      param({ id: 'foldAngleDeg', name: 'Fold Angle (-999 = auto)', value: -999, defaultValue: -999, min: -999, max: 360, step: 1, uniform: 'uFoldAngleDeg' }),

      // ===== BACK =====
      param({ id: 'paperColor',  name: 'Paper Color (reveal)', type: 'color', value: '#f9f6ec', defaultValue: '#f9f6ec', uniform: 'uPaperColor' }),
      param({ id: 'backColor',   name: 'Back Color',           type: 'color', value: '#f0ecda', defaultValue: '#f0ecda', uniform: 'uBackColor' }),
      param({ id: 'backOpacity', name: 'Back Content Opacity', value: 0.9,  defaultValue: 0.9,  min: 0, max: 1, step: 0.01, uniform: 'uBackOpacity' }),
      param({ id: 'backTint',    name: 'Back Tint Amount',     value: 0.2,  defaultValue: 0.2,  min: 0, max: 1, step: 0.01, uniform: 'uBackTint' }),

      // ===== LIGHTING =====
      param({ id: 'lightDirDeg', name: 'Light Direction (deg)', value: 135, defaultValue: 135, min: 0, max: 360, step: 1, uniform: 'uLightDirDeg' }),

      // ===== GLOBAL =====
      param({ id: 'mix', name: 'Mix', value: 1.0, defaultValue: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMix' }),

      // ===== CUSTOM =====
      param({ id: 'curlRadius',     name: 'Custom: Curl Radius (tightness)', value: 0.10, defaultValue: 0.10, min: 0.02, max: 0.4, step: 0.005, uniform: 'uCurlRadius' }),
      param({ id: 'shadowStrength', name: 'Custom: Shadow Strength',         value: 0.55, defaultValue: 0.55, min: 0, max: 1, step: 0.01, uniform: 'uShadowStrength' }),
      param({ id: 'shadowSize',     name: 'Custom: Shadow Size',             value: 0.15, defaultValue: 0.15, min: 0.02, max: 1, step: 0.01, uniform: 'uShadowSize' }),
      param({ id: 'sheenColor',     name: 'Custom: Sheen Color',             type: 'color', value: '#fff8ea', defaultValue: '#fff8ea', uniform: 'uSheenColor' }),
      param({ id: 'sheenStrength',  name: 'Custom: Sheen Strength',          value: 0.7,  defaultValue: 0.7,  min: 0, max: 3, step: 0.05, uniform: 'uSheenStrength' }),
    ],
  ),
  fragmentShader: FRAG,
  usesTime: true,
};