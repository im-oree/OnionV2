import type { Layer } from './layer';
import type { Vec3 } from './layer';

export interface WorkArea { start: number; end: number; enabled: boolean }

export type RendererMode = 'draft' | 'preview' | 'full';
export type ViewMode = 'activeCamera' | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'custom';

export interface Fog3D {
  enabled: boolean;
  color: string;
  density: number;
  near: number;
  far: number;
}

export interface Environment3D {
  fog: Fog3D;
  ambientColor: string;
  groundPlaneVisible: boolean;
  worldAxisVisible: boolean;
  cameraFrustumsVisible: boolean;
  lightIconsVisible: boolean;
}

export function defaultEnvironment3D(): Environment3D {
  return {
    fog: { enabled: false, color: '#808080', density: 0.01, near: 1, far: 10000 },
    ambientColor: '#404040',
    groundPlaneVisible: true,
    worldAxisVisible: true,
    cameraFrustumsVisible: true,
    lightIconsVisible: true,
  };
}

export interface Composition {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor: string;
  layers: Layer[];
  currentTime: number;
  workAreaStart: number;
  workAreaEnd: number;
  pixelAspect: number;
  /** 3D environment settings — only meaningful when comp has 3D layers */
  environment3D?: Environment3D;
  /** Renderer mode: draft (unlit), preview (lit), full (lit+shadows+DOF) */
  rendererMode?: RendererMode;
  /** Which view to show in viewport */
  viewMode?: ViewMode;
}
