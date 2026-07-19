import * as THREE from 'three';
import type { GradientFill, LinearGradient, RadialGradient } from '../../types/layer';

const MAX_STOPS = 8;

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform int uType;             // 0 = linear, 1 = radial
  uniform float uAngle;          // degrees
  uniform vec2 uCenter;          // 0..1 for radial
  uniform float uRadius;         // 0..1 for radial
  uniform int uStopCount;
  uniform vec4 uStops[${MAX_STOPS}]; // xyz=color, w=offset
  uniform float uOpacity;

  vec3 sampleGradient(float t) {
    t = clamp(t, 0.0, 1.0);
    if (uStopCount == 0) return vec3(1.0);
    if (uStopCount == 1) return uStops[0].xyz;
    // Find surrounding stops
    for (int i = 0; i < ${MAX_STOPS - 1}; i++) {
      if (i >= uStopCount - 1) break;
      float o1 = uStops[i].w;
      float o2 = uStops[i + 1].w;
      if (t >= o1 && t <= o2) {
        float f = (o2 - o1 > 0.0001) ? (t - o1) / (o2 - o1) : 0.0;
        return mix(uStops[i].xyz, uStops[i + 1].xyz, f);
      }
    }
    // Beyond last stop
    return uStops[uStopCount - 1].xyz;
  }

  void main() {
    float t;
    if (uType == 0) {
      // Linear
      float rad = radians(uAngle);
      vec2 dir = vec2(cos(rad), sin(rad));
      vec2 p = vUv - 0.5;
      t = dot(p, dir) + 0.5;
    } else {
      // Radial
      vec2 delta = vUv - uCenter;
      t = length(delta) / max(0.001, uRadius);
    }
    vec3 col = sampleGradient(t);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

function hexToVec3(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createGradientMaterial(fill: GradientFill, opacity = 1): THREE.ShaderMaterial {
  const stops = new Array(MAX_STOPS).fill(0).map(() => new THREE.Vector4(1, 1, 1, 0));
  fill.stops.slice(0, MAX_STOPS).forEach((s, i) => {
    const [r, g, b] = hexToVec3(s.color);
    stops[i] = new THREE.Vector4(r, g, b, s.offset);
  });

  const uniforms: Record<string, THREE.IUniform> = {
    uType:      { value: fill.type === 'linear-gradient' ? 0 : 1 },
    uAngle:     { value: (fill as LinearGradient).angle ?? 0 },
    uCenter:    { value: new THREE.Vector2(
      (fill as RadialGradient).centerX ?? 0.5,
      (fill as RadialGradient).centerY ?? 0.5,
    )},
    uRadius:    { value: (fill as RadialGradient).radius ?? 0.5 },
    uStopCount: { value: fill.stops.length },
    uStops:     { value: stops },
    uOpacity:   { value: opacity },
  };

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    side: THREE.DoubleSide,
  });
}

export function updateGradientMaterial(
  mat: THREE.ShaderMaterial,
  fill: GradientFill,
  opacity = 1,
): void {
  mat.uniforms.uType.value = fill.type === 'linear-gradient' ? 0 : 1;
  if (fill.type === 'linear-gradient') {
    mat.uniforms.uAngle.value = fill.angle;
  } else {
    mat.uniforms.uCenter.value.set(fill.centerX, fill.centerY);
    mat.uniforms.uRadius.value = fill.radius;
  }
  const stops = mat.uniforms.uStops.value as THREE.Vector4[];
  for (let i = 0; i < MAX_STOPS; i++) {
    if (i < fill.stops.length) {
      const [r, g, b] = hexToVec3(fill.stops[i].color);
      stops[i].set(r, g, b, fill.stops[i].offset);
    } else {
      stops[i].set(1, 1, 1, 0);
    }
  }
  mat.uniforms.uStopCount.value = fill.stops.length;
  mat.uniforms.uOpacity.value = opacity;
  mat.uniformsNeedUpdate = true;
}