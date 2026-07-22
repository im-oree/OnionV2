/**
 * CC Particle World — pro procedural particle system.
 * WeakMap state, O(1) pool, dt physics with substeps, HSL color, 9 style presets.
 */
import * as THREE from 'three';
import type { EffectModule, EffectRenderContext } from './types';
import { def, param } from './types';

// ============================================================================
// Constants & Types
// ============================================================================

const MAX_PARTICLES = 4000;
const MAX_SUBSTEPS = 4;

interface Particle {
  alive: boolean;
  age: number;
  maxLife: number;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  size: number;
  rot: number;
  rotSpeed: number;
  seed: number;
}

interface FXState {
  particles: Particle[];
  freeList: number[];
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  texture: THREE.CanvasTexture;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  lastTime: number;
  currentShape: string;
  currentTexSize: number;
}

const stateStore = new WeakMap<object, FXState>();

// ============================================================================
// Style Presets
// ============================================================================

interface Preset {
  birthRate: number;
  longevity: number;
  producerShape: string; // 'box' | 'sphere' | 'point' | 'ring'
  prodSizeX: number; prodSizeY: number; prodSizeZ: number;
  velX: number; velY: number; velZ: number;
  velRadial: number;
  velRand: number;
  gravY: number;
  drag: number;
  turbulence: number;
  turbFreq: number;
  windX: number; windY: number;
  particleShape: string; // 'circle' | 'star' | 'triangle' | 'streak' | 'spark'
  birthSize: number;
  deathSize: number;
  sizeVar: number;
  birthOpacity: number;
  deathOpacity: number;
  colorStart: string;
  colorEnd: string;
  colorMode: string; // 'rgb' | 'hsl'
  rotSpeed: number;
}

const PRESETS: Preset[] = [
  // 0 - Fire
  { birthRate: 40, longevity: 1.5, producerShape: 'box',
    prodSizeX: 0.3, prodSizeY: 0.05, prodSizeZ: 0.3,
    velX: 0, velY: 60, velZ: 0, velRadial: 0, velRand: 0.6,
    gravY: -30, drag: 0.5, turbulence: 0.8, turbFreq: 1.5, windX: 0, windY: 0,
    particleShape: 'circle', birthSize: 25, deathSize: 5, sizeVar: 0.4,
    birthOpacity: 1, deathOpacity: 0, colorStart: '#ff2200', colorEnd: '#ffdd00',
    colorMode: 'hsl', rotSpeed: 0.5 },
  // 1 - Fireworks
  { birthRate: 30, longevity: 2.0, producerShape: 'point',
    prodSizeX: 0, prodSizeY: 0, prodSizeZ: 0,
    velX: 0, velY: 0, velZ: 0, velRadial: 180, velRand: 0.3,
    gravY: 80, drag: 0.4, turbulence: 0.1, turbFreq: 1, windX: 0, windY: 0,
    particleShape: 'spark', birthSize: 8, deathSize: 2, sizeVar: 0.3,
    birthOpacity: 1, deathOpacity: 0, colorStart: '#ffee00', colorEnd: '#ff0066',
    colorMode: 'hsl', rotSpeed: 0 },
  // 2 - Snow
  { birthRate: 15, longevity: 8, producerShape: 'box',
    prodSizeX: 2, prodSizeY: 0, prodSizeZ: 0.5,
    velX: 0, velY: -30, velZ: 0, velRadial: 0, velRand: 0.2,
    gravY: -10, drag: 1.0, turbulence: 0.3, turbFreq: 0.4, windX: 15, windY: 0,
    particleShape: 'circle', birthSize: 10, deathSize: 8, sizeVar: 0.6,
    birthOpacity: 0.9, deathOpacity: 0.6, colorStart: '#ffffff', colorEnd: '#eef4ff',
    colorMode: 'rgb', rotSpeed: 0.3 },
  // 3 - Rain
  { birthRate: 80, longevity: 1.2, producerShape: 'box',
    prodSizeX: 2.4, prodSizeY: 0, prodSizeZ: 0.5,
    velX: -30, velY: -400, velZ: 0, velRadial: 0, velRand: 0.1,
    gravY: -50, drag: 0.1, turbulence: 0.05, turbFreq: 0.5, windX: 0, windY: 0,
    particleShape: 'streak', birthSize: 20, deathSize: 20, sizeVar: 0.2,
    birthOpacity: 0.7, deathOpacity: 0.5, colorStart: '#a0c8ff', colorEnd: '#7099dd',
    colorMode: 'rgb', rotSpeed: 0 },
  // 4 - Explosion
  { birthRate: 200, longevity: 1.5, producerShape: 'sphere',
    prodSizeX: 0.05, prodSizeY: 0.05, prodSizeZ: 0.05,
    velX: 0, velY: 0, velZ: 0, velRadial: 300, velRand: 0.5,
    gravY: 30, drag: 1.5, turbulence: 0.4, turbFreq: 2, windX: 0, windY: 0,
    particleShape: 'circle', birthSize: 30, deathSize: 60, sizeVar: 0.6,
    birthOpacity: 1, deathOpacity: 0, colorStart: '#ffcc00', colorEnd: '#661100',
    colorMode: 'hsl', rotSpeed: 0.8 },
  // 5 - Smoke
  { birthRate: 25, longevity: 4, producerShape: 'box',
    prodSizeX: 0.2, prodSizeY: 0.05, prodSizeZ: 0.2,
    velX: 0, velY: 40, velZ: 0, velRadial: 0, velRand: 0.4,
    gravY: -8, drag: 0.9, turbulence: 0.6, turbFreq: 0.6, windX: 15, windY: 0,
    particleShape: 'circle', birthSize: 20, deathSize: 90, sizeVar: 0.5,
    birthOpacity: 0.35, deathOpacity: 0, colorStart: '#555555', colorEnd: '#888888',
    colorMode: 'rgb', rotSpeed: 0.15 },
  // 6 - Vortex
  { birthRate: 40, longevity: 3, producerShape: 'ring',
    prodSizeX: 0.7, prodSizeY: 0.05, prodSizeZ: 0.7,
    velX: 0, velY: 0, velZ: 0, velRadial: -60, velRand: 0.2,
    gravY: 0, drag: 0.3, turbulence: 0.2, turbFreq: 1, windX: 0, windY: 0,
    particleShape: 'star', birthSize: 12, deathSize: 4, sizeVar: 0.3,
    birthOpacity: 1, deathOpacity: 0, colorStart: '#66ffee', colorEnd: '#ff33cc',
    colorMode: 'hsl', rotSpeed: 2 },
  // 7 - Fountain
  { birthRate: 60, longevity: 2.5, producerShape: 'point',
    prodSizeX: 0.05, prodSizeY: 0, prodSizeZ: 0.05,
    velX: 0, velY: 250, velZ: 0, velRadial: 40, velRand: 0.5,
    gravY: 250, drag: 0.2, turbulence: 0.15, turbFreq: 1, windX: 0, windY: 0,
    particleShape: 'circle', birthSize: 10, deathSize: 4, sizeVar: 0.3,
    birthOpacity: 0.9, deathOpacity: 0, colorStart: '#33aaff', colorEnd: '#aaeeff',
    colorMode: 'hsl', rotSpeed: 0 },
  // 8 - Sparkle
  { birthRate: 20, longevity: 1.5, producerShape: 'box',
    prodSizeX: 1.5, prodSizeY: 1, prodSizeZ: 0.5,
    velX: 0, velY: 0, velZ: 0, velRadial: 0, velRand: 0.05,
    gravY: 0, drag: 2, turbulence: 0.05, turbFreq: 1, windX: 0, windY: 0,
    particleShape: 'star', birthSize: 12, deathSize: 4, sizeVar: 0.6,
    birthOpacity: 1, deathOpacity: 0, colorStart: '#ffff88', colorEnd: '#ffffff',
    colorMode: 'hsl', rotSpeed: 3 },
];

// ============================================================================
// Turbulence: value noise, 3D
// ============================================================================

function hash3(x: number, y: number, z: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const n000 = hash3(ix,   iy,   iz);
  const n100 = hash3(ix+1, iy,   iz);
  const n010 = hash3(ix,   iy+1, iz);
  const n110 = hash3(ix+1, iy+1, iz);
  const n001 = hash3(ix,   iy,   iz+1);
  const n101 = hash3(ix+1, iy,   iz+1);
  const n011 = hash3(ix,   iy+1, iz+1);
  const n111 = hash3(ix+1, iy+1, iz+1);
  const nx00 = n000 * (1 - sx) + n100 * sx;
  const nx10 = n010 * (1 - sx) + n110 * sx;
  const nx01 = n001 * (1 - sx) + n101 * sx;
  const nx11 = n011 * (1 - sx) + n111 * sx;
  const nxy0 = nx00 * (1 - sy) + nx10 * sy;
  const nxy1 = nx01 * (1 - sy) + nx11 * sy;
  return nxy0 * (1 - sz) + nxy1 * sz;
}

function fbm3(x: number, y: number, z: number, oct: number): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += noise3(x*f, y*f, z*f) * a; f *= 2; a *= 0.5; }
  return v;
}

// ============================================================================
// Particle texture generator
// ============================================================================

function createParticleTexture(shape: string, size: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;

  if (shape === 'circle') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'spark') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'star') {
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.3)');
    ctx.fillStyle = g;
    ctx.fill();
  } else if (shape === 'triangle') {
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.866, r * 0.5);
    ctx.lineTo(-r * 0.866, r * 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  } else { // streak - vertical elongated
    const g = ctx.createLinearGradient(cx, 0, cx, size);
    g.addColorStop(0.0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 2, 0, 4, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

// ============================================================================
// HSL color helpers
// ============================================================================

const _hex = new THREE.Color();
const _hslA = { h: 0, s: 0, l: 0 };
const _hslB = { h: 0, s: 0, l: 0 };

function lerpColorHSL(outR: {r: number, g: number, b: number}, hexA: string, hexB: string, t: number) {
  _hex.set(hexA); _hex.getHSL(_hslA);
  const ar = _hex.r, ag = _hex.g, ab = _hex.b;
  _hex.set(hexB); _hex.getHSL(_hslB);
  // shortest hue path
  let dh = _hslB.h - _hslA.h;
  if (dh > 0.5) dh -= 1; else if (dh < -0.5) dh += 1;
  const h = _hslA.h + dh * t;
  const s = _hslA.s + (_hslB.s - _hslA.s) * t;
  const l = _hslA.l + (_hslB.l - _hslA.l) * t;
  _hex.setHSL((h + 1) % 1, s, l);
  outR.r = _hex.r; outR.g = _hex.g; outR.b = _hex.b;
}

function lerpColorRGB(out: {r: number, g: number, b: number}, hexA: string, hexB: string, t: number) {
  _hex.set(hexA);
  const ar = _hex.r, ag = _hex.g, ab = _hex.b;
  _hex.set(hexB);
  out.r = ar + (_hex.r - ar) * t;
  out.g = ag + (_hex.g - ag) * t;
  out.b = ab + (_hex.b - ab) * t;
}

// ============================================================================
// GLSL for particle rendering
// ============================================================================

const V_SHADER = `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aRotation;
  attribute vec3  aColor;
  varying float vAlpha;
  varying vec3  vColor;
  varying float vRot;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vRot = aRotation;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (400.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const F_SHADER = `
  precision highp float;
  uniform sampler2D uTex;
  varying float vAlpha;
  varying vec3  vColor;
  varying float vRot;
  void main() {
    if (vAlpha < 0.001) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    uv = mat2(c, -s, s, c) * uv;
    uv += 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 tc = texture2D(uTex, uv);
    vec3 col = tc.rgb * vColor;
    gl_FragColor = vec4(col, tc.a * vAlpha);
  }
`;

// ============================================================================
// State creation
// ============================================================================

function createState(shape: string, texSize: number): FXState {
  const texture = createParticleTexture(shape, texSize);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors    = new Float32Array(MAX_PARTICLES * 3);
  const sizes     = new Float32Array(MAX_PARTICLES);
  const alphas    = new Float32Array(MAX_PARTICLES);
  const rots      = new Float32Array(MAX_PARTICLES);
  geometry.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor',    new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize',     new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha',    new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aRotation', new THREE.BufferAttribute(rots, 1));
  geometry.setDrawRange(0, MAX_PARTICLES);

  const material = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: texture } },
    vertexShader: V_SHADER,
    fragmentShader: F_SHADER,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  const scene = new THREE.Scene();
  scene.add(points);
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
  camera.position.set(0, 0, 1000);

  const particles: Particle[] = [];
  const freeList: number[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push({
      alive: false, age: 0, maxLife: 1,
      px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0,
      size: 0, rot: 0, rotSpeed: 0, seed: Math.random() * 1000,
    });
    freeList.push(i);
  }

  return {
    particles, freeList, points, geometry, material, texture,
    scene, camera, lastTime: 0, currentShape: shape, currentTexSize: texSize,
  };
}

function disposeState(s: FXState) {
  s.geometry.dispose();
  s.material.dispose();
  s.texture.dispose();
  s.scene.remove(s.points);
}

// ============================================================================
// Effect module
// ============================================================================

export const ccParticleWorldEffect: EffectModule = {
  definition: def('ccParticleWorld', 'CC Particle World', 'generate',
    'Pro procedural particle system. 9 style presets, physics, turbulence, HSL color blending.',
    1, [
    // ===== STYLE =====
    param({ id: 'style', name: 'Style Preset', type: 'select', value: 0, defaultValue: 0,
      options: [
        { label: 'Fire',       value: 0 },
        { label: 'Fireworks',  value: 1 },
        { label: 'Snow',       value: 2 },
        { label: 'Rain',       value: 3 },
        { label: 'Explosion',  value: 4 },
        { label: 'Smoke',      value: 5 },
        { label: 'Vortex',     value: 6 },
        { label: 'Fountain',   value: 7 },
        { label: 'Sparkle',    value: 8 },
        { label: 'Custom',     value: 9 },
      ], uniform: 'uStyle' }),

    // ===== GLOBAL =====
    param({ id: 'masterOpacity', name: 'Master Opacity', value: 1.0, min: 0, max: 1, step: 0.01, uniform: 'uMasterOpacity' }),
    param({ id: 'timeScale',     name: 'Time Scale',     value: 1.0, min: 0, max: 4, step: 0.05, uniform: 'uTimeScale' }),

    // ===== PRODUCER =====
    param({ id: 'producerX', name: 'Producer X', value: 0,   min: -1, max: 1, step: 0.005, uniform: 'uProdX' }),
    param({ id: 'producerY', name: 'Producer Y', value: 0.3, min: -1, max: 1, step: 0.005, uniform: 'uProdY' }),
    param({ id: 'producerZ', name: 'Producer Z', value: 0,   min: -1, max: 1, step: 0.005, uniform: 'uProdZ' }),

    // ===== CUSTOM: BIRTH =====
    param({ id: 'birthRate',      name: 'Custom: Birth Rate (per sec)', value: 40, min: 0, max: 500, step: 1, uniform: 'uBirthRate' }),
    param({ id: 'longevity',      name: 'Custom: Longevity (sec)',      value: 1.5, min: 0.1, max: 15, step: 0.1, uniform: 'uLongevity' }),
    param({ id: 'producerShape',  name: 'Custom: Producer Shape', type: 'select', value: 'box', options: [
      { label: 'Box',    value: 'box' },
      { label: 'Sphere', value: 'sphere' },
      { label: 'Point',  value: 'point' },
      { label: 'Ring',   value: 'ring' },
    ], uniform: 'uProdShape' }),
    param({ id: 'prodSizeX', name: 'Custom: Producer Size X', value: 0.3, min: 0, max: 3, step: 0.01, uniform: 'uPSX' }),
    param({ id: 'prodSizeY', name: 'Custom: Producer Size Y', value: 0.05, min: 0, max: 3, step: 0.01, uniform: 'uPSY' }),
    param({ id: 'prodSizeZ', name: 'Custom: Producer Size Z', value: 0.3, min: 0, max: 3, step: 0.01, uniform: 'uPSZ' }),

    // ===== CUSTOM: VELOCITY =====
    param({ id: 'velX',       name: 'Custom: Velocity X', value: 0,  min: -500, max: 500, step: 1, uniform: 'uVX' }),
    param({ id: 'velY',       name: 'Custom: Velocity Y', value: 60, min: -500, max: 500, step: 1, uniform: 'uVY' }),
    param({ id: 'velZ',       name: 'Custom: Velocity Z', value: 0,  min: -500, max: 500, step: 1, uniform: 'uVZ' }),
    param({ id: 'velRadial',  name: 'Custom: Radial Velocity', value: 0, min: -500, max: 500, step: 1, uniform: 'uVR' }),
    param({ id: 'velRand',    name: 'Custom: Velocity Randomness', value: 0.5, min: 0, max: 2, step: 0.01, uniform: 'uVRand' }),

    // ===== CUSTOM: PHYSICS =====
    param({ id: 'gravY',      name: 'Custom: Gravity Y', value: -30, min: -300, max: 300, step: 1, uniform: 'uGravY' }),
    param({ id: 'drag',       name: 'Custom: Drag',      value: 0.5, min: 0, max: 3, step: 0.05, uniform: 'uDrag' }),
    param({ id: 'windX',      name: 'Custom: Wind X',    value: 0,  min: -100, max: 100, step: 1, uniform: 'uWX' }),
    param({ id: 'windY',      name: 'Custom: Wind Y',    value: 0,  min: -100, max: 100, step: 1, uniform: 'uWY' }),

    // ===== CUSTOM: TURBULENCE =====
    param({ id: 'turbulence', name: 'Custom: Turbulence',      value: 0.8, min: 0, max: 3, step: 0.05, uniform: 'uTurb' }),
    param({ id: 'turbFreq',   name: 'Custom: Turbulence Freq', value: 1.5, min: 0.1, max: 5, step: 0.1, uniform: 'uTurbF' }),

    // ===== CUSTOM: PARTICLE =====
    param({ id: 'particleShape', name: 'Custom: Particle Shape', type: 'select', value: 'circle', options: [
      { label: 'Circle',   value: 'circle' },
      { label: 'Spark',    value: 'spark' },
      { label: 'Star',     value: 'star' },
      { label: 'Triangle', value: 'triangle' },
      { label: 'Streak',   value: 'streak' },
    ], uniform: 'uPShape' }),
    param({ id: 'birthSize',   name: 'Custom: Birth Size',    value: 25, min: 1, max: 200, step: 1, uniform: 'uBSize' }),
    param({ id: 'deathSize',   name: 'Custom: Death Size',    value: 5,  min: 0, max: 200, step: 1, uniform: 'uDSize' }),
    param({ id: 'sizeVar',     name: 'Custom: Size Variation', value: 0.4, min: 0, max: 1, step: 0.01, uniform: 'uSV' }),
    param({ id: 'rotSpeed',    name: 'Custom: Rotation Speed', value: 0.5, min: -10, max: 10, step: 0.05, uniform: 'uRotSpd' }),

    // ===== CUSTOM: OPACITY & COLOR =====
    param({ id: 'birthOpacity', name: 'Custom: Birth Opacity', value: 1, min: 0, max: 1, step: 0.01, uniform: 'uBO' }),
    param({ id: 'deathOpacity', name: 'Custom: Death Opacity', value: 0, min: 0, max: 1, step: 0.01, uniform: 'uDO' }),
    param({ id: 'colorStart',   name: 'Custom: Birth Color', type: 'color', value: '#ff2200', uniform: 'uCS' }),
    param({ id: 'colorEnd',     name: 'Custom: Death Color', type: 'color', value: '#ffdd00', uniform: 'uCE' }),
    param({ id: 'colorMode',    name: 'Custom: Color Blend', type: 'select', value: 'hsl', options: [
      { label: 'HSL (smooth hue path)', value: 'hsl' },
      { label: 'RGB (direct)',           value: 'rgb' },
    ], uniform: 'uCMode' }),
  ]),

  usesTime: true,

  customRender: (ctx: EffectRenderContext) => {
    const { instance, writeTarget, renderer, currentTime, width, height } = ctx;

    // Read params
    const p = instance.parameters.reduce((a: Record<string, any>, x) => { a[x.id] = x.value; return a; }, {});
    const styleIdx = Math.max(0, Math.min(9, Math.round(p.style ?? 0)));
    const isCustom = styleIdx === 9;
    const preset: Preset = isCustom
      ? {
          birthRate: p.birthRate, longevity: p.longevity, producerShape: p.producerShape,
          prodSizeX: p.prodSizeX, prodSizeY: p.prodSizeY, prodSizeZ: p.prodSizeZ,
          velX: p.velX, velY: p.velY, velZ: p.velZ, velRadial: p.velRadial, velRand: p.velRand,
          gravY: p.gravY, drag: p.drag, turbulence: p.turbulence, turbFreq: p.turbFreq,
          windX: p.windX, windY: p.windY, particleShape: p.particleShape,
          birthSize: p.birthSize, deathSize: p.deathSize, sizeVar: p.sizeVar,
          birthOpacity: p.birthOpacity, deathOpacity: p.deathOpacity,
          colorStart: p.colorStart, colorEnd: p.colorEnd, colorMode: p.colorMode, rotSpeed: p.rotSpeed,
        }
      : PRESETS[styleIdx];

    const producerX = p.producerX ?? 0;
    const producerY = p.producerY ?? 0.3;
    const producerZ = p.producerZ ?? 0;
    const masterOpacity = p.masterOpacity ?? 1;
    const timeScale = p.timeScale ?? 1;

    // ===== State get/create =====
    let state = stateStore.get(instance);
    const desiredShape = preset.particleShape;
    if (!state || state.currentShape !== desiredShape) {
      if (state) disposeState(state);
      state = createState(desiredShape, 64);
      stateStore.set(instance, state);
      state.lastTime = currentTime;
    }

    // ===== dt =====
    let dt = currentTime - state.lastTime;
    state.lastTime = currentTime;
    if (dt < 0) dt = 0;
    dt = Math.min(dt, 0.1); // clamp to avoid huge jumps
    dt *= timeScale;

    // Substeps for physics stability
    const substeps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / 0.02)));
    const sdt = dt / substeps;

    // Sizes
    const halfW = width / 2;
    const halfH = height / 2;
    const halfMin = Math.min(halfW, halfH);

    // ===== Spawn =====
    const targetSpawnCount = preset.birthRate * dt;
    let spawnInt = Math.floor(targetSpawnCount);
    const spawnFrac = targetSpawnCount - spawnInt;
    if (Math.random() < spawnFrac) spawnInt++;

    for (let s = 0; s < spawnInt && state.freeList.length > 0; s++) {
      const idx = state.freeList.pop()!;
      const pt = state.particles[idx];
      pt.alive = true;
      pt.age = 0;
      pt.maxLife = preset.longevity * (0.7 + Math.random() * 0.3);
      pt.seed = Math.random() * 1000;

      // Position within producer
      const rx = Math.random() - 0.5;
      const ry = Math.random() - 0.5;
      const rz = Math.random() - 0.5;
      let ox = 0, oy = 0, oz = 0;
      if (preset.producerShape === 'box') {
        ox = rx * preset.prodSizeX * halfW;
        oy = ry * preset.prodSizeY * halfH;
        oz = rz * preset.prodSizeZ * halfMin;
      } else if (preset.producerShape === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random());
        ox = Math.sin(phi) * Math.cos(theta) * r * preset.prodSizeX * halfMin;
        oy = Math.sin(phi) * Math.sin(theta) * r * preset.prodSizeY * halfMin;
        oz = Math.cos(phi)                     * r * preset.prodSizeZ * halfMin;
      } else if (preset.producerShape === 'ring') {
        const theta = Math.random() * Math.PI * 2;
        const r = 0.9 + Math.random() * 0.2;
        ox = Math.cos(theta) * r * preset.prodSizeX * halfMin;
        oz = Math.sin(theta) * r * preset.prodSizeZ * halfMin;
        oy = ry * preset.prodSizeY * halfH;
      }
      // 'point' = zero offset

      pt.px = producerX * halfW + ox;
      pt.py = producerY * halfH + oy;
      pt.pz = producerZ * halfMin + oz;

      // Velocity: base + radial + random
      const rvx = (Math.random() - 0.5) * 2;
      const rvy = (Math.random() - 0.5) * 2;
      const rvz = (Math.random() - 0.5) * 2;
      let vx = preset.velX + rvx * preset.velRand * 100;
      let vy = preset.velY + rvy * preset.velRand * 100;
      let vz = preset.velZ + rvz * preset.velRand * 100;

      if (preset.velRadial !== 0) {
        const dx = ox, dy = oy, dz = oz;
        const len = Math.hypot(dx, dy, dz) || 1;
        if (preset.producerShape === 'point') {
          // spherical burst
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          vx += Math.sin(phi) * Math.cos(theta) * preset.velRadial;
          vy += Math.sin(phi) * Math.sin(theta) * preset.velRadial;
          vz += Math.cos(phi) * preset.velRadial;
        } else {
          // outward from center of producer
          vx += (dx / len) * preset.velRadial;
          vy += (dy / len) * preset.velRadial;
          vz += (dz / len) * preset.velRadial;
        }
      }

      pt.vx = vx; pt.vy = vy; pt.vz = vz;
      pt.size = preset.birthSize * (1 - preset.sizeVar + Math.random() * preset.sizeVar * 2);
      pt.rot = Math.random() * Math.PI * 2;
      pt.rotSpeed = preset.rotSpeed * (0.5 + Math.random());
    }

    // ===== Update =====
    const posAttr = state.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = state.geometry.attributes.aColor as THREE.BufferAttribute;
    const sizAttr = state.geometry.attributes.aSize as THREE.BufferAttribute;
    const alpAttr = state.geometry.attributes.aAlpha as THREE.BufferAttribute;
    const rotAttr = state.geometry.attributes.aRotation as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors    = colAttr.array as Float32Array;
    const sizes     = sizAttr.array as Float32Array;
    const alphas    = alpAttr.array as Float32Array;
    const rots      = rotAttr.array as Float32Array;

    const gravY = preset.gravY;
    const windX = preset.windX;
    const windY = preset.windY;
    const drag  = preset.drag;
    const turb  = preset.turbulence;
    const turbF = preset.turbFreq;
    const tempCol = { r: 0, g: 0, b: 0 };
    const useHSL = preset.colorMode === 'hsl';

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const pt = state.particles[i];
      if (!pt.alive) {
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }

      // Substep integration
      for (let s = 0; s < substeps; s++) {
        // Gravity + wind
        pt.vx += windX * sdt;
        pt.vy += (gravY + windY) * sdt;

        // Drag
        const dragF = 1 - Math.min(0.99, drag * sdt);
        pt.vx *= dragF; pt.vy *= dragF; pt.vz *= dragF;

        // Turbulence (curl-noise-ish via 3 fbm samples)
        if (turb > 0.001) {
          const nx = pt.px * 0.005 * turbF;
          const ny = pt.py * 0.005 * turbF;
          const nz = pt.pz * 0.005 * turbF + currentTime * 0.3;
          const t1 = fbm3(nx,           ny,           nz, 2) - 0.5;
          const t2 = fbm3(nx + 100,     ny + 100,     nz, 2) - 0.5;
          const t3 = fbm3(nx + 200,     ny + 200,     nz, 2) - 0.5;
          pt.vx += t1 * turb * 80 * sdt;
          pt.vy += t2 * turb * 80 * sdt;
          pt.vz += t3 * turb * 80 * sdt;
        }

        pt.px += pt.vx * sdt;
        pt.py += pt.vy * sdt;
        pt.pz += pt.vz * sdt;
        pt.rot += pt.rotSpeed * sdt;
      }

      pt.age += dt;
      if (pt.age >= pt.maxLife) {
        pt.alive = false;
        state.freeList.push(i);
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }

      const life01 = pt.age / pt.maxLife;

      // Size & opacity lerp
      const sz = preset.birthSize + (preset.deathSize - preset.birthSize) * life01;
      const sizeMul = pt.size / preset.birthSize;
      const finalSize = sz * sizeMul;
      const op = preset.birthOpacity + (preset.deathOpacity - preset.birthOpacity) * life01;

      // Color lerp
      if (useHSL) lerpColorHSL(tempCol, preset.colorStart, preset.colorEnd, life01);
      else        lerpColorRGB(tempCol, preset.colorStart, preset.colorEnd, life01);

      positions[i*3    ] = pt.px;
      positions[i*3 + 1] = pt.py;
      positions[i*3 + 2] = pt.pz;
      colors[i*3    ] = tempCol.r;
      colors[i*3 + 1] = tempCol.g;
      colors[i*3 + 2] = tempCol.b;
      sizes[i]  = finalSize;
      alphas[i] = op * masterOpacity;
      rots[i]   = pt.rot;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizAttr.needsUpdate = true;
    alpAttr.needsUpdate = true;
    rotAttr.needsUpdate = true;

    // Camera
    state.camera.aspect = width / height;
    state.camera.position.set(0, 0, Math.max(halfW, halfH) * 2.2);
    state.camera.updateProjectionMatrix();

    // ===== Render (save & restore renderer state) =====
    const prevTarget = renderer.getRenderTarget();
    const prevClearColor = new THREE.Color();
    renderer.getClearColor(prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha();
    const prevAutoClear = renderer.autoClear;
    const prevScissorTest = renderer.getScissorTest();

    renderer.setRenderTarget(writeTarget);
    renderer.setScissorTest(false);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(state.scene, state.camera);

    // Restore
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClearColor, prevClearAlpha);
    renderer.autoClear = prevAutoClear;
    renderer.setScissorTest(prevScissorTest);
  },
};