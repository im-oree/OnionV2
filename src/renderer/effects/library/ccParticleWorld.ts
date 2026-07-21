/**
 * CC Particle World — full procedural particle system effect.
 *
 * Emits additive sprites (circle, star, triangle) from a producer grid
 * with birth rate, longevity, gravity, velocity, turbulence, and color
 * controls. Uses customRender to manage a Three.js Points system that
 * updates per frame.
 */
import * as THREE from 'three';
import type { EffectModule, EffectRenderContext } from './types';
import { def, param } from './types';

// ── Particle buffer geometry ──────────────────────────────────────
const MAX_PARTICLES = 2000;

interface Particle {
  age: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  color: THREE.Color;
  opacity: number;
}

function createParticleTexture(shape: string, size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 1;

  if (shape === 'circle') {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'star') {
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  } else {
    // triangle
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.866, r * 0.5);
    ctx.lineTo(-r * 0.866, r * 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createParticleMaterial(tex: THREE.Texture): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    size: 20,
    map: tex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
  });
}

// ── Turbulence (simplex-like hash noise) ──────────────────────────

function hash(x: number, y: number, z: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function turbulence(x: number, y: number, z: number, octaves: number): number {
  let val = 0, amp = 1, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += hash(x * freq, y * freq, z * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return val;
}

// ── Effect module ─────────────────────────────────────────────────

export const ccParticleWorldEffect: EffectModule = {
  definition: def('ccParticleWorld', 'CC Particle World', 'generate',
    'Full procedural particle system with gravity, turbulence, and additive sprites.',
    1, [
    // Birth
    param({ id: 'birthRate',     name: 'Birth Rate',      value: 5,   min: 0,  max: 100,  step: 0.5,  uniform: 'uBirthRate' }),
    param({ id: 'longevity',     name: 'Longevity (sec)',  value: 2,   min: 0.1,max: 10,   step: 0.1,  uniform: 'uLongevity' }),
    // Producer
    param({ id: 'producerX',     name: 'Producer X',       value: 0,   min: -1, max: 1,    step: 0.01, uniform: 'uProducerX' }),
    param({ id: 'producerY',     name: 'Producer Y',       value: 0,   min: -1, max: 1,    step: 0.01, uniform: 'uProducerY' }),
    param({ id: 'producerZ',     name: 'Producer Z',       value: 0,   min: -1, max: 1,    step: 0.01, uniform: 'uProducerZ' }),
    param({ id: 'producerSizeX', name: 'Grid Size X',       value: 0.5, min: 0,  max: 2,    step: 0.01, uniform: 'uProdSizeX' }),
    param({ id: 'producerSizeY', name: 'Grid Size Y',       value: 0.5, min: 0,  max: 2,    step: 0.01, uniform: 'uProdSizeY' }),
    param({ id: 'producerSizeZ', name: 'Grid Size Z',       value: 0.5, min: 0,  max: 2,    step: 0.01, uniform: 'uProdSizeZ' }),
    // Velocity
    param({ id: 'velocityX',     name: 'Velocity X',      value: 0,   min: -5, max: 5,    step: 0.1,  uniform: 'uVelX' }),
    param({ id: 'velocityY',     name: 'Velocity Y',      value: 1,   min: -5, max: 5,    step: 0.1,  uniform: 'uVelY' }),
    param({ id: 'velocityZ',     name: 'Velocity Z',      value: 0,   min: -5, max: 5,    step: 0.1,  uniform: 'uVelZ' }),
    param({ id: 'velocityRand',  name: 'Velocity Random',  value: 0.5, min: 0,  max: 2,    step: 0.01, uniform: 'uVelRand' }),
    // Gravity
    param({ id: 'gravityX',      name: 'Gravity X',       value: 0,   min: -2, max: 2,    step: 0.05, uniform: 'uGravityX' }),
    param({ id: 'gravityY',      name: 'Gravity Y',       value: -0.5,min: -2, max: 2,    step: 0.05, uniform: 'uGravityY' }),
    param({ id: 'gravityZ',      name: 'Gravity Z',       value: 0,   min: -2, max: 2,    step: 0.05, uniform: 'uGravityZ' }),
    // Turbulence
    param({ id: 'turbulence',    name: 'Turbulence',      value: 0.5, min: 0,  max: 2,    step: 0.01, uniform: 'uTurbulence' }),
    param({ id: 'turbFreq',      name: 'Turbulence Freq', value: 1,   min: 0.1,max: 5,    step: 0.1,  uniform: 'uTurbFreq' }),
    param({ id: 'turbOctaves',   name: 'Turbulence Oct.',  value: 2,   min: 1,  max: 4,    step: 1,    uniform: 'uTurbOctaves' }),
    // Particle appearance
    param({ id: 'particleType',  name: 'Particle Shape',  type: 'select', value: 'circle', options: [
      { label: 'Circle', value: 'circle' },
      { label: 'Star',   value: 'star' },
      { label: 'Triangle', value: 'triangle' },
    ], uniform: 'uParticleType' }),
    param({ id: 'particleSize',  name: 'Size',           value: 15,  min: 1,  max: 100,  step: 1,     uniform: 'uParticleSize' }),
    param({ id: 'opacity',       name: 'Opacity',         value: 1, min: 0,  max: 1,    step: 0.05,  uniform: 'uOpacity' }),
    param({ id: 'colorStart',    name: 'Color Start',     type: 'color', value: '#ff6600', uniform: 'uColorStart' }),
    param({ id: 'colorEnd',      name: 'Color End',       type: 'color', value: '#ffdd00', uniform: 'uColorEnd' }),
  ]),

  usesTime: true,

  customRender: (ctx: EffectRenderContext) => {
    const { instance, writeTarget, renderer, currentTime, width, height } = ctx;
    const p = instance.parameters.reduce((acc: Record<string, any>, param) => {
      acc[param.id] = param.value;
      return acc;
    }, {});

    const birthRate = (p.birthRate as number) ?? 5;
    const longevity = (p.longevity as number) ?? 2;
    const maxLifeTicks = Math.max(1, Math.round(longevity * 60));

    // Producer position (normalized -1..1 mapped to comp coords)
    const prodX = (p.producerX as number) ?? 0;
    const prodY = (p.producerY as number) ?? 0;
    const prodZ = (p.producerZ as number) ?? 0;
    const prodSX = (p.producerSizeX as number) ?? 0.5;
    const prodSY = (p.producerSizeY as number) ?? 0.5;
    const prodSZ = (p.producerSizeZ as number) ?? 0.5;

    const velX = (p.velocityX as number) ?? 0;
    const velY = (p.velocityY as number) ?? 1;
    const velZ = (p.velocityZ as number) ?? 0;
    const velRand = (p.velocityRand as number) ?? 0.5;

    const gravX = (p.gravityX as number) ?? 0;
    const gravY = (p.gravityY as number) ?? -0.5;
    const gravZ = (p.gravityZ as number) ?? 0;

    const turbAmt = (p.turbulence as number) ?? 0.5;
    const turbFreq = (p.turbFreq as number) ?? 1;
    const turbOct = Math.max(1, Math.round((p.turbOctaves as number) ?? 2));

    const particleSize = (p.particleSize as number) ?? 15;
    const opacity = (p.opacity as number) ?? 1;
    const shape = (p.particleType as string) ?? 'circle';
    const colorStart = new THREE.Color((p.colorStart as string) ?? '#ff6600');
    const colorEnd = new THREE.Color((p.colorEnd as string) ?? '#ffdd00');

    // ── Manage particle system per effect instance ──
    const key = `ccParticleWorld_${instance.id}`;
    if (!(window as any).__fxState) (window as any).__fxState = {};
    let state = (window as any).__fxState?.[key] as Record<string, any> | undefined;

    // Check if particleType changed — recreate texture if so
    const prevShape = state?.particleShape as string | undefined;

    if (!state || prevShape !== shape) {
      // Clean up old state if shape changed
      if (state) {
        if (state.tex) state.tex.dispose();
        if (state.mat) state.mat.dispose();
        if (state.points) {
          if (state.points.parent) state.points.parent.remove(state.points);
          state.points.geometry?.dispose();
        }
        if (state.particleScene) {
          state.particleScene.children.length = 0;
        }
      }

      const tex = createParticleTexture(shape, 64);
      const mat = createParticleMaterial(tex);
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(MAX_PARTICLES * 3);
      const colors = new Float32Array(MAX_PARTICLES * 3);
      const sizes = new Float32Array(MAX_PARTICLES);
      const alphas = new Float32Array(MAX_PARTICLES);
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geom.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      // Custom shader material for per-particle size + alpha
      const vShader = `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }`;
      const fShader = `
        uniform sampler2D uTex;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(texColor.rgb * vColor, texColor.a * vAlpha);
        }`;
      const uniforms = { uTex: { value: tex } };
      const shaderMat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vShader,
        fragmentShader: fShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });

      const points = new THREE.Points(geom, shaderMat);
      points.frustumCulled = false;

      // Add points to the scene via the renderer's scene
      // We add it to the renderer's scene — the effect chain renders into writeTarget
      // which has its own camera/scene, so we add to a temporary container
      const particles: Particle[] = [];
      for (let i = 0; i < MAX_PARTICLES; i++) {
        particles.push({
          age: Infinity, // dead
          maxLife: maxLifeTicks,
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(0, 0, 0),
          size: particleSize,
          color: new THREE.Color(),
          opacity: 0,
        });
      }

      state = { particles, points, geom, mat, tex, lastTime: currentTime, tick: 0, particleShape: shape };
      (window as any).__fxState[key] = state;
    }

    // ── Detect removal: zero-size target = effect detached, clean up ──
    if (writeTarget.width < 2 || writeTarget.height < 2) {
      if (state) {
        state.geom?.dispose();
        (state.points?.material as THREE.Material)?.dispose();
        state.tex?.dispose();
        if (state.particleScene) {
          state.particleScene.children.length = 0;
        }
        delete (window as any).__fxState[key];
      }
      return;
    }

    // ── Update particle simulation ──
    // Clamp dt to [0, 0.05] — negative dt happens when playback loops back to time 0
    const dt = Math.max(0, Math.min(0.05, currentTime - state.lastTime));
    state.lastTime = currentTime;
    const particlesPerTick = birthRate * dt * 60;
    let toSpawn = Math.min(Math.floor(particlesPerTick), MAX_PARTICLES);
    const randFrac = particlesPerTick - toSpawn;
    if (Math.random() < randFrac) toSpawn++;



    let spawnIdx = 0;
    for (let i = 0; i < MAX_PARTICLES && spawnIdx < toSpawn; i++) {
      if (state.particles[i].age >= state.particles[i].maxLife) {
        const p = state.particles[i];
        // Spawn within producer grid (normalized to comp coords)
        const halfW = width / 2;
        const halfH = height / 2;
        p.pos.set(
          (prodX + (Math.random() - 0.5) * prodSX) * halfW,
          (prodY + (Math.random() - 0.5) * prodSY) * halfH,
          (prodZ + (Math.random() - 0.5) * prodSZ) * Math.min(halfW, halfH),
        );
        p.vel.set(
          velX + (Math.random() - 0.5) * velRand * 100,
          velY + (Math.random() - 0.5) * velRand * 100,
          velZ + (Math.random() - 0.5) * velRand * 100,
        );
        p.age = 0;
        p.maxLife = maxLifeTicks * (0.5 + Math.random() * 0.5);
        p.size = particleSize * (0.5 + Math.random() * 0.5);
        spawnIdx++;
      }
    }

    // Update living particles
    const positions = state.geom.attributes.position.array as Float32Array;
    const colors = state.geom.attributes.color.array as Float32Array;
    const sizes = state.geom.attributes.size.array as Float32Array;
    const alphas = state.geom.attributes.alpha.array as Float32Array;

    let livingCount = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = state.particles[i];
      p.age++;

      if (p.age >= p.maxLife) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        sizes[i] = 0;
        alphas[i] = 0;
        continue;
      }

      livingCount++;

      const life01 = p.age / p.maxLife;

      // Apply gravity
      p.vel.x += gravX * 50 * dt;
      p.vel.y += gravY * 50 * dt;
      p.vel.z += gravZ * 50 * dt;

      // Apply turbulence
      if (turbAmt > 0) {
        const turb = turbulence(p.pos.x * turbFreq * 0.01, p.pos.y * turbFreq * 0.01, p.pos.z * turbFreq * 0.01 + currentTime * 0.5, turbOct);
        p.vel.x += (turb - 0.5) * turbAmt * 50 * dt;
        p.vel.y += (turb - 0.5) * turbAmt * 50 * dt;
        p.vel.z += (turb - 0.5) * turbAmt * 50 * dt;
      }

      // Apply velocity
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;

      // Fade in / fade out
      const fadeIn = Math.min(1, p.age / (maxLifeTicks * 0.1));
      const fadeOut = Math.max(0, (p.maxLife - p.age) / (maxLifeTicks * 0.15));
      const alpha = fadeIn * fadeOut * opacity;

      // Color lerp from start to end over life
      p.color.copy(colorStart).lerp(colorEnd, life01);

      positions[i * 3] = p.pos.x;
      positions[i * 3 + 1] = p.pos.y;
      positions[i * 3 + 2] = p.pos.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
      alphas[i] = Math.max(0, alpha);
    }

    state.geom.attributes.position.needsUpdate = true;
    state.geom.attributes.color.needsUpdate = true;
    state.geom.attributes.size.needsUpdate = true;
    state.geom.attributes.alpha.needsUpdate = true;

    // ── Create or reuse scene + camera for 3D particle render ──
    if (!(state as any).particleScene) {
      (state as any).particleScene = new THREE.Scene();
      (state as any).particleScene.add(state.points);
      (state as any).particleCam = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
      (state as any).particleCam.position.set(0, 0, Math.max(width, height));
      (state as any).particleCam.lookAt(0, 0, 0);
    }
    const particleScene = (state as any).particleScene as THREE.Scene;
    const particleCam = (state as any).particleCam as THREE.PerspectiveCamera;
    particleCam.aspect = width / height;
    particleCam.updateProjectionMatrix();

    // ── Render into writeTarget ──
    const oldTarget = renderer.getRenderTarget();
    const oldClear = new THREE.Color();
    renderer.getClearColor(oldClear);
    const oldClearAlpha = renderer.getClearAlpha();

    renderer.setRenderTarget(writeTarget);
    // Disable scissor test — composition clipping shouldn't clip particle FBO
    renderer.setScissorTest(false);
    renderer.clear(true, true, false); // clear color + depth for fresh accumulation
    renderer.render(particleScene, particleCam);

    renderer.setRenderTarget(oldTarget);
    renderer.setClearColor(oldClear, oldClearAlpha);
  },
};
