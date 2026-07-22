import type { EffectModule } from './types';
import { def, param } from './types';

const FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2  uResolution;

// Adjust
uniform float uRadius;
uniform float uOffsetX;
uniform float uOffsetY;

// Rotation
uniform float uRotX;
uniform float uRotY;
uniform float uRotZ;
uniform float uRotOrder;   // 0 XYZ, 1 XZY, 2 YXZ, 3 YZX, 4 ZXY, 5 ZYX

// Light
uniform float uLightType;  // 0 None, 1 Directional, 2 Ambient
uniform vec3  uLightColor;
uniform float uLightIntensity;
uniform float uLightDirection; // degrees
uniform float uLightHeight;

// Shading
uniform float uAmbient;
uniform float uDiffuse;
uniform float uSpecular;
uniform float uRoughness;
uniform float uMetal;

// Render
uniform float uRenderMode; // 0 Full, 1 Outside, 2 Inside, 3 Wireframe

// Wrap
uniform float uWrapX;
uniform float uWrapY;

varying vec2 vUv;

const float PI  = 3.14159265;
const float TAU = 6.28318530;

// Rotation matrices per axis
mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0,
              0.0,   c,  -s,
              0.0,   s,   c);
}
mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(  c, 0.0,   s,
              0.0, 1.0, 0.0,
               -s, 0.0,   c);
}
mat3 rotZ(float a) {
  float c = cos(a), s = sin(a);
  return mat3(  c,  -s, 0.0,
                s,   c, 0.0,
              0.0, 0.0, 1.0);
}

mat3 buildRotation(float ax, float ay, float az, int order) {
  mat3 x = rotX(ax);
  mat3 y = rotY(ay);
  mat3 z = rotZ(az);
  if (order == 0) return z * y * x;   // XYZ (apply X first)
  if (order == 1) return y * z * x;   // XZY
  if (order == 2) return z * x * y;   // YXZ
  if (order == 3) return x * z * y;   // YZX
  if (order == 4) return y * x * z;   // ZXY
  return x * y * z;                    // ZYX
}

// Sample the equirectangular texture from a unit-sphere position
vec4 sampleSphere(vec3 p) {
  float u = 0.5 + atan(p.x, p.z) / TAU;
  float v = 0.5 - asin(clamp(p.y, -1.0, 1.0)) / PI;

  // Optional wrap tiling
  u = fract(u * uWrapX);
  v = clamp(v * uWrapY, 0.0, 1.0);

  return texture2D(uTexture, vec2(u, v));
}

// Wireframe drawing on the unit sphere
float wireframe(vec3 p) {
  float u = 0.5 + atan(p.x, p.z) / TAU;
  float v = 0.5 - asin(clamp(p.y, -1.0, 1.0)) / PI;
  vec2 grid = vec2(u * 24.0, v * 12.0);
  vec2 f = abs(fract(grid) - 0.5);
  float line = min(f.x, f.y);
  return 1.0 - smoothstep(0.02, 0.04, line);
}

void main() {
  vec4 src = texture2D(uTexture, vUv);

  // Aspect-correct so radius is a real circle
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = vUv - vec2(0.5 + uOffsetX, 0.5 + uOffsetY);
  uv.x *= aspect;

  float r  = uRadius;
  float r2 = uRadius * uRadius;
  float d2 = dot(uv, uv);

  int renderMode = int(uRenderMode + 0.5);

  // Outside the sphere
  if (d2 > r2) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Front-face z (positive = toward viewer)
  float zFront = sqrt(max(r2 - d2, 0.0));

  // Rotation matrix
  int order = int(uRotOrder + 0.5);
  mat3 R = buildRotation(radians(uRotX), radians(uRotY), radians(uRotZ), order);

  // Camera-space normal(s)
  vec3 nFront = vec3(uv.x, uv.y, zFront) / r;
  vec3 nBack  = vec3(uv.x, uv.y, -zFront) / r;

  // Rotate the sphere: transform the sample point into texture space
  vec3 pFront = R * nFront;
  vec3 pBack  = R * nBack;

  // ---- Choose which face(s) to render ----
  vec4 colFront = vec4(0.0);
  vec4 colBack  = vec4(0.0);
  bool showFront = (renderMode == 0 || renderMode == 1);
  bool showBack  = (renderMode == 0 || renderMode == 2);

  if (renderMode == 3) {
    // Wireframe only
    float wf = max(wireframe(pFront), wireframe(pBack) * 0.35);
    gl_FragColor = vec4(vec3(wf), wf);
    return;
  }

  if (showFront) colFront = sampleSphere(pFront);
  if (showBack)  colBack  = sampleSphere(pBack);

  // ---- Lighting ----
  int lightType = int(uLightType + 0.5);

  // Light direction: uLightDirection is compass angle in degrees,
  // uLightHeight lifts the light above/below the sphere.
  float la = radians(uLightDirection);
  vec3 lightDir = normalize(vec3(cos(la), uLightHeight * 0.001, sin(la)));

  vec3 viewDir = vec3(0.0, 0.0, 1.0); // camera looks down -Z, so front normal.z = +
  vec3 nShade  = nFront;              // shading always uses outward normal

  float NdotL = max(dot(nShade, lightDir), 0.0);
  float NdotV = max(dot(nShade, viewDir), 0.0);
  vec3  H     = normalize(lightDir + viewDir);
  float NdotH = max(dot(nShade, H), 0.0);

  // Specular sharpness: roughness 0 = tight, 1 = broad
  float shininess = mix(256.0, 4.0, clamp(uRoughness, 0.0, 1.0));
  float spec = pow(NdotH, shininess);

  vec3 baseCol = showFront ? colFront.rgb : colBack.rgb;

  vec3 shaded;
  if (lightType == 0) {
    // No light - flat color
    shaded = baseCol;
  } else if (lightType == 2) {
    // Ambient only - uniform brightness tinted by light color
    shaded = baseCol * mix(vec3(1.0), uLightColor, 0.5) * uLightIntensity;
    shaded = mix(baseCol, shaded, uAmbient);
  } else {
    // Directional
    vec3 ambientTerm  = baseCol * uAmbient;
    vec3 diffuseTerm  = baseCol * uLightColor * NdotL * uDiffuse * uLightIntensity;
    // Metal: specular takes color from base, non-metal stays white
    vec3 specColor    = mix(vec3(1.0), baseCol, uMetal);
    vec3 specularTerm = specColor * spec * uSpecular * uLightIntensity;
    shaded = ambientTerm + diffuseTerm + specularTerm;
  }

  // ---- Compose front + back so back-face shows through edge ----
  vec4 finalCol;
  if (renderMode == 0) {
    // Full: back rendered darker + behind front
    float backShade = 0.4 + 0.6 * max(dot(-nShade, lightDir), 0.0) * (lightType == 1 ? 1.0 : 0.0);
    vec3 backCol = colBack.rgb * (lightType == 0 ? 1.0 : backShade);
    // Front is opaque, so back only visible via edge falloff — but with no alpha in texture
    // we blend front over back
    finalCol = vec4(shaded, 1.0);
  } else if (renderMode == 1) {
    finalCol = vec4(shaded, 1.0);
  } else {
    // Inside only
    finalCol = vec4(colBack.rgb, 1.0);
  }

  // Smooth alpha at the sphere edge
  float edge = smoothstep(r, r * 0.985, sqrt(d2));
  finalCol.a *= edge;
  finalCol.rgb *= edge;

  gl_FragColor = finalCol;
}
`;

export const ccSphereEffect: EffectModule = {
  definition: def(
    'ccSphere',
    'CC Sphere',
    'distort',
    'AE-grade 3D sphere with lighting, shading and render modes.',
    1,
    [
      // ---- Adjust ----
      param({ id: 'radius',  name: 'Radius',   value: 0.45, defaultValue: 0.45, min: 0.05, max: 2, step: 0.005, uniform: 'uRadius' }),
      param({ id: 'offsetX', name: 'Offset X', value: 0,    defaultValue: 0,    min: -1, max: 1, step: 0.001, uniform: 'uOffsetX' }),
      param({ id: 'offsetY', name: 'Offset Y', value: 0,    defaultValue: 0,    min: -1, max: 1, step: 0.001, uniform: 'uOffsetY' }),

      // ---- Rotation ----
      param({ id: 'rotX', name: 'Rotate X (deg)', value: 0, defaultValue: 0, min: -720, max: 720, step: 0.5, uniform: 'uRotX' }),
      param({ id: 'rotY', name: 'Rotate Y (deg)', value: 0, defaultValue: 0, min: -720, max: 720, step: 0.5, uniform: 'uRotY' }),
      param({ id: 'rotZ', name: 'Rotate Z (deg)', value: 0, defaultValue: 0, min: -720, max: 720, step: 0.5, uniform: 'uRotZ' }),
      param({ id: 'rotOrder', name: 'Rotation Order', type: 'select', value: 0, defaultValue: 0,
        options: [
          { label: 'XYZ', value: 0 },
          { label: 'XZY', value: 1 },
          { label: 'YXZ', value: 2 },
          { label: 'YZX', value: 3 },
          { label: 'ZXY', value: 4 },
          { label: 'ZYX', value: 5 },
        ], uniform: 'uRotOrder' }),

      // ---- Light ----
      param({ id: 'lightType', name: 'Light Type', type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'None',        value: 0 },
          { label: 'Directional', value: 1 },
          { label: 'Ambient',     value: 2 },
        ], uniform: 'uLightType' }),
      param({ id: 'lightColor',     name: 'Light Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uLightColor' }),
      param({ id: 'lightIntensity', name: 'Light Intensity', value: 1.0, defaultValue: 1.0, min: 0, max: 2, step: 0.01, uniform: 'uLightIntensity' }),
      param({ id: 'lightDirection', name: 'Light Direction (deg)', value: 45, defaultValue: 45, min: 0, max: 360, step: 1, uniform: 'uLightDirection' }),
      param({ id: 'lightHeight',    name: 'Light Height', value: 200, defaultValue: 200, min: -1000, max: 1000, step: 10, uniform: 'uLightHeight' }),

      // ---- Shading ----
      param({ id: 'ambient',   name: 'Ambient',   value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uAmbient' }),
      param({ id: 'diffuse',   name: 'Diffuse',   value: 0.8, defaultValue: 0.8, min: 0, max: 1, step: 0.01, uniform: 'uDiffuse' }),
      param({ id: 'specular',  name: 'Specular',  value: 0.4, defaultValue: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uSpecular' }),
      param({ id: 'roughness', name: 'Roughness', value: 0.3, defaultValue: 0.3, min: 0, max: 1, step: 0.01, uniform: 'uRoughness' }),
      param({ id: 'metal',     name: 'Metal',     value: 0,   defaultValue: 0,   min: 0, max: 1, step: 0.01, uniform: 'uMetal' }),

      // ---- Render ----
      param({ id: 'renderMode', name: 'Render', type: 'select', value: 1, defaultValue: 1,
        options: [
          { label: 'Full',         value: 0 },
          { label: 'Outside Only', value: 1 },
          { label: 'Inside Only',  value: 2 },
          { label: 'Wireframe',    value: 3 },
        ], uniform: 'uRenderMode' }),

      // ---- Texture wrap (bonus) ----
      param({ id: 'wrapX', name: 'Wrap X (tiles)', value: 1, defaultValue: 1, min: 0.1, max: 10, step: 0.1, uniform: 'uWrapX' }),
      param({ id: 'wrapY', name: 'Wrap Y (tiles)', value: 1, defaultValue: 1, min: 0.1, max: 10, step: 0.1, uniform: 'uWrapY' }),
    ],
  ),
  fragmentShader: FRAG,
};