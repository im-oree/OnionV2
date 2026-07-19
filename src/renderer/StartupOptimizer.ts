/**
 * StartupOptimizer — runs non-blocking initialization tasks at app startup.
 *
 * 1. Precompile all effect shaders in the background (non-blocking).
 * 2. Warm up WebGL context with a dummy render.
 * 3. Detect hardware profile and apply defaults.
 * 4. Load worker files eagerly for instant first use.
 * 5. Warm up the FrameCache with default settings.
 */
import { shaderLoader } from '../renderer/shaders/ShaderLoader';
import { getHardwareProfile } from '../config/HardwareProfile';
import { WorkerPool } from '../workers/WorkerPool';
import { FrameCache } from '../renderer/cache/FrameCache';

/** All effect fragment shader paths to precompile at startup */
const EFFECT_SHADER_PATHS = [
  // Core blending shaders
  'blends/normal.frag',
  'blends/multiply.frag',
  'blends/screen.frag',
  'blends/overlay.frag',
  'blends/add.frag',

  // Effect shaders (scaffolded)
  'effects/levels.frag',
  'effects/curves.frag',
  'effects/hueSat.frag',
  'effects/blur.frag',
  'effects/glow.frag',
  'effects/transform.frag',
];

/** Precompile all effect shaders (non-blocking, returns a promise) */
export async function precompileShaders(): Promise<void> {
  try {
    await shaderLoader.preloadAll(EFFECT_SHADER_PATHS);
  } catch {
    // Shader precompilation is best-effort; silently fail
  }
}

/** Warm up WebGL context by rendering a single dummy frame */
export function warmupWebGL(container: HTMLElement): void {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      // Issue a dummy clear to warm up the driver
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  } catch {
    // WebGL warmup is best-effort
  }
}

/** Pre-warm the FrameCache with default hardware profile */
export function warmupFrameCache(): void {
  const profile = getHardwareProfile();
  // Apply cache budget from hardware profile
  const fc = (window as any).__frameCache as FrameCache;
  if (fc) {
    fc.setMaxBytes(profile.cacheBudget);
  }
}

/** Eagerly load worker scripts (create pool immediately but don't queue work) */
export function warmupWorkers(): WorkerPool | null {
  try {
    const profile = getHardwareProfile();
    if (!profile.workersEnabled) return null;

    // Create the worker pool but keyframe worker URL is resolved via blob/URL
    // For Vite/esbuild, we use import.meta.url based paths
    const workerUrl = new URL('../workers/keyframeWorker.ts', import.meta.url).href;
    const pool = new WorkerPool(workerUrl, profile.maxWorkers);
    return pool;
  } catch {
    // Worker warmup is best-effort
    return null;
  }
}

/** Run all startup optimizations asynchronously */
export async function runStartupOptimizations(container?: HTMLElement): Promise<void> {
  // 1. Precompile shaders (fully async, non-blocking)
  precompileShaders().then(() => {
    console.log('[Startup] Shader precompilation complete');
  });

  // 2. Warm up WebGL (instant)
  if (container) {
    warmupWebGL(container);
  }

  // 3. Warm up FrameCache (instant)
  warmupFrameCache();

  // 4. Warm up workers (async)
  const pool = warmupWorkers();
  if (pool) {
    // Store for later use
    (window as any).__workerPool = pool;
  }
}

export default runStartupOptimizations;
