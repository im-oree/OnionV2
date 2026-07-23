/**
 * HardwareProfile — detects hardware capabilities and auto-configures
 * playback/render settings for optimal performance.
 *
 * Detection: navigator.hardwareConcurrency, navigator.deviceMemory,
 * GPU renderer string via WebGL debug info.
 *
 * Classification: 'low' | 'medium' | 'high'
 */

export type Tier = 'low' | 'medium' | 'high';

export interface HardwareConfig {
  tier: Tier;
  cores: number;
  deviceMemoryGB: number;
  gpuRenderer: string;
  gpuVendor: string;
  /** Suggested max cache in bytes */
  cacheBudget: number;
  /** Suggested initial resolution mode */
  resolutionMode: 'full' | 'half' | 'quarter' | 'auto';
  /** Enable web workers */
  workersEnabled: boolean;
  /** Max worker threads */
  maxWorkers: number;
  /** Enable OffscreenCanvas rendering (if supported) */
  offscreenCanvas: boolean;
  /** Suggested max pixel ratio */
  maxDPR: number;
  /** Layer count thresholds */
  maxLayers1080p: number;
  maxLayers720p: number;
}

function detectGPU(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return { renderer: 'unknown', vendor: 'unknown' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return { renderer: 'unknown', vendor: 'unknown' };
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string || 'unknown';
    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string || 'unknown';
    return { renderer, vendor };
  } catch {
    return { renderer: 'unknown', vendor: 'unknown' };
  }
}

function isLowEndGPU(renderer: string): boolean {
  const lowEnd = [
    'intel hd graphics', 'intel uhd graphics', 'intel iris',
    'mali', 'adreno 5', 'adreno 6',
    'powervr', 'vivante', 'tegra',
  ];
  const lower = renderer.toLowerCase();
  return lowEnd.some(keyword => lower.includes(keyword));
}

export function detectHardware(): HardwareConfig {
  const cores = navigator.hardwareConcurrency || 4;
  const deviceMemoryGB = ((navigator as any).deviceMemory) || 4;
  const { renderer: gpuRenderer, vendor: gpuVendor } = detectGPU();
  const lowGPU = isLowEndGPU(gpuRenderer);

  // Tier classification
  let tier: Tier;
  if (cores <= 4 && deviceMemoryGB <= 4 && lowGPU) {
    tier = 'low';
  } else if (cores >= 8 && deviceMemoryGB >= 8 && !lowGPU) {
    tier = 'high';
  } else {
    tier = 'medium';
  }

  // OffscreenCanvas support
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined'
    && typeof OffscreenCanvas.prototype.getContext === 'function';

  // Config per tier
  switch (tier) {
    case 'low':
      return {
        tier, cores, deviceMemoryGB, gpuRenderer, gpuVendor,
        cacheBudget: 512 * 1024 * 1024, // 512 MB
        resolutionMode: 'auto',
        workersEnabled: cores > 2,
        maxWorkers: Math.max(1, Math.min(2, cores - 1)),
        offscreenCanvas: false,
        maxDPR: 1,
        maxLayers1080p: 10,
        maxLayers720p: 20,
      };
    case 'medium':
      return {
        tier, cores, deviceMemoryGB, gpuRenderer, gpuVendor,
        cacheBudget: 2 * 1024 * 1024 * 1024, // 2 GB
        resolutionMode: 'auto',
        workersEnabled: true,
        maxWorkers: Math.max(1, Math.min(4, cores - 1)),
        offscreenCanvas,
        maxDPR: 2,
        maxLayers1080p: 20,
        maxLayers720p: 40,
      };
    case 'high':
      return {
        tier, cores, deviceMemoryGB, gpuRenderer, gpuVendor,
        cacheBudget: 4 * 1024 * 1024 * 1024, // 4 GB
        resolutionMode: 'full',
        workersEnabled: true,
        maxWorkers: Math.max(1, Math.min(6, cores - 1)),
        offscreenCanvas: offscreenCanvas && tier === 'high',
        maxDPR: 2,
        maxLayers1080p: 40,
        maxLayers720p: 80,
      };
  }
}

/** Singleton hardware profile — detected once at startup */
let _profile: HardwareConfig | null = null;

export function getHardwareProfile(): HardwareConfig {
  if (!_profile) {
    _profile = detectHardware();
  }
  return _profile;
}

/** Re-detect (e.g., after user changes hardware) */
export function redetectHardware(): HardwareConfig {
  _profile = detectHardware();
  return _profile;
}
