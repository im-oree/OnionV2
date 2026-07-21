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

export interface MotionBlurSettings {
  enabled: boolean;
  shutterAngle: number;
  shutterPhase: number;
  samples: number;
}

export function defaultMotionBlur(): MotionBlurSettings {
  return {
    enabled: false,
    shutterAngle: 180,   // AE default
    shutterPhase: 0,     // -180..180
    samples: 16,         // per-frame samples
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
  /** Global motion blur settings */
  motionBlur?: MotionBlurSettings;
  /** Folder assignment in the project browser tree. */
  folderId?: string | null;

  /** 3D perspective mode — built-in camera, no camera layer needed */
  perspective3D?: boolean;

  // ── Camera transforms (all keyframeable) ──
  /** Camera mode: perspective (default) or orthographic */
  cameraMode?: 'perspective' | 'orthographic';
  /** Camera world position (X/Y = pan, Z = distance along forward axis) */
  cameraPositionX?: number;
  cameraPositionY?: number;
  cameraPositionZ?: number;
  /** Camera rotation (pitch X, yaw Y, roll Z) in radians */
  cameraRotationX?: number;
  cameraRotationY?: number;
  cameraRotationZ?: number;

  // ── Camera lens ──
  /** Field of view in degrees */
  cameraFOV?: number;
  /** Digital zoom multiplier */
  cameraZoom?: number;
  /** Near clipping plane */
  cameraNear?: number;
  /** Far clipping plane */
  cameraFar?: number;

  // ── Camera effects ──
  cameraDOF?: boolean;
  cameraFocusDistance?: number;
  cameraAperture?: number;
  cameraExposure?: number;

  // ── Camera UI ──
  cameraShowGizmo?: boolean;
  cameraSelected?: boolean;
  cameraInvertOrbit?: boolean;
  cameraInvertPan?: boolean;
  cameraInvertZoom?: boolean;
  /** Allow camera orbit/pan/zoom in Active Camera view (default false = camera locked) */
  cameraMoveWithView?: boolean;

  // ── 3D Scene Settings ──
  /** Fly-through movement speed (units/sec) */
  flySpeed?: number;
  /** Show the ground grid in 3D view */
  gridVisible?: boolean;
  /** Grid spacing in world units */
  gridSize?: number;
  /** Show axis helper arrows */
  showAxes?: boolean;
  /** Show camera frustum wireframe */
  showFrustum?: boolean;

  // ── Legacy camera properties (migrate to cameraRotationX/Y, cameraPositionX/Y) ──
  /** @deprecated Use cameraRotationX/Y instead */
  cameraOrbitX?: number;
  /** @deprecated Use cameraRotationX/Y instead */
  cameraOrbitY?: number;
  /** @deprecated Use cameraPositionX/Y instead */
  cameraPanX?: number;
  /** @deprecated Use cameraPositionX/Y instead */
  cameraPanY?: number;
}
