/**
 * CameraController — single source of truth for both Active Camera view
 * (looking through the composition's own camera) and Free View
 * (orbit-around-focal-point camera used for scene navigation).
 *
 * Replaces the scattered window.__freeViewMode / __freeOrbitX / __freeOrbitY
 * / __freeDistance / __freeLookAtX/Y/Z globals with a proper state object
 * persisted per-composition. Emits change events via CameraEvents bus.
 */
import * as THREE from 'three';
import { emitCameraChange } from './utils/CameraEvents';
import { useCompositionStore } from '../state/compositionStore';

export type ViewMode = 'activeCamera' | 'freeView';

export interface FreeViewState {
  pitch: number;      // radians, clamped to (-π/2 + ε, π/2 - ε)
  yaw: number;        // radians, unbounded
  distance: number;   // world units from focal point to camera
  focal: { x: number; y: number; z: number };
  orthographic: boolean;
}

export interface ActiveCameraState {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  fov: number;
  near: number;
  far: number;
}

const PITCH_LIMIT = Math.PI / 2 - 0.01;

/** Clamp helper */
const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export class CameraController {
  /** Current view mode — Active Camera (default) or Free View */
  private _mode: ViewMode = 'activeCamera';

  /** Free View state (loaded from + saved to comp) */
  private _free: FreeViewState = {
    pitch: 0.3,
    yaw: 0.5,
    distance: 1500,
    focal: { x: 0, y: 0, z: 0 },
    orthographic: false,
  };

  /** THREE.js camera used for Free View — perspective OR ortho */
  private _freeCamera: THREE.PerspectiveCamera;
  private _freeOrthoCamera: THREE.OrthographicCamera;

  /** Active view mode listeners */
  private _listeners = new Set<(mode: ViewMode) => void>();

  private _viewportW = 1;
  private _viewportH = 1;

  /** Currently-attached composition id — for persistence */
  private _compId: string | null = null;

  constructor() {
    this._freeCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 50000);
    this._freeOrthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -50000, 50000);
    this._recomputeFreeCamera();
  }

  // ── Mode ─────────────────────────────────────────────────

  get mode(): ViewMode { return this._mode; }
  get isFreeView(): boolean { return this._mode === 'freeView'; }
  get isActiveCamera(): boolean { return this._mode === 'activeCamera'; }

  setMode(mode: ViewMode): void {
    if (this._mode === mode) return;
    this._mode = mode;
    // Persist mode in comp state
    if (this._compId) {
      useCompositionStore.getState().updateComposition(this._compId, {
        activeViewMode: mode,
      });
    }
    for (const l of this._listeners) l(mode);
    emitCameraChange();
  }

  toggleMode(): void {
    this.setMode(this._mode === 'freeView' ? 'activeCamera' : 'freeView');
  }

  onModeChange(fn: (mode: ViewMode) => void): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  // ── Composition binding + persistence ────────────────────

  /** Bind to a composition — loads free view state from its stored fields */
  bindComposition(compId: string | null): void {
    if (this._compId === compId) return;
    this._compId = compId;
    if (!compId) return;
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    // Restore mode
    this._mode = comp.activeViewMode === 'freeView' ? 'freeView' : 'activeCamera';

    // Restore free view state — defaults if never saved
    this._free = {
      pitch: comp.freeOrbitPitch ?? 0.3,
      yaw:   comp.freeOrbitYaw   ?? 0.5,
      distance: comp.freeDistance ?? 1500,
      focal: {
        x: comp.freeFocalX ?? 0,
        y: comp.freeFocalY ?? 0,
        z: comp.freeFocalZ ?? 0,
      },
      orthographic: !!comp.freeOrthographic,
    };
    this._recomputeFreeCamera();
    for (const l of this._listeners) l(this._mode);
    emitCameraChange();
  }

  private _persistFree(): void {
    if (!this._compId) return;
    useCompositionStore.getState().updateComposition(this._compId, {
      freeOrbitPitch: this._free.pitch,
      freeOrbitYaw:   this._free.yaw,
      freeDistance:   this._free.distance,
      freeFocalX:     this._free.focal.x,
      freeFocalY:     this._free.focal.y,
      freeFocalZ:     this._free.focal.z,
      freeOrthographic: this._free.orthographic,
    }, true /* silent — no history noise */);
  }

  // ── Viewport size ────────────────────────────────────────

  setViewportSize(w: number, h: number): void {
    if (w === this._viewportW && h === this._viewportH) return;
    this._viewportW = Math.max(1, w);
    this._viewportH = Math.max(1, h);
    this._recomputeFreeCamera();
    emitCameraChange();
  }

  // ── Free View math ───────────────────────────────────────

  get freeState(): Readonly<FreeViewState> { return this._free; }
  get freeCamera(): THREE.Camera {
    return this._free.orthographic ? this._freeOrthoCamera : this._freeCamera;
  }

  /**
   * Compute camera world position from focal + orbit angles + distance.
   *   camera = focal + distance * (dir from pitch,yaw)
   * where pitch=0, yaw=0 puts camera on +Z looking at focal.
   */
  private _computeCameraPosition(): THREE.Vector3 {
    const { pitch, yaw, distance, focal } = this._free;
    const cosP = Math.cos(pitch);
    // Standard spherical: yaw around Y, pitch around X
    const dirX = Math.sin(yaw) * cosP;
    const dirY = Math.sin(pitch);
    const dirZ = Math.cos(yaw) * cosP;
    return new THREE.Vector3(
      focal.x + dirX * distance,
      focal.y + dirY * distance,
      focal.z + dirZ * distance,
    );
  }

  private _recomputeFreeCamera(): void {
    const aspect = this._viewportW / this._viewportH;
    const camPos = this._computeCameraPosition();

    // Perspective
    this._freeCamera.aspect = aspect;
    this._freeCamera.fov = 50;
    this._freeCamera.near = 0.1;
    this._freeCamera.far = 100000;
    this._freeCamera.position.copy(camPos);
    this._freeCamera.lookAt(this._free.focal.x, this._free.focal.y, this._free.focal.z);
    this._freeCamera.updateProjectionMatrix();

    // Ortho — sized by distance so scroll wheel still gives "zoom" feel
    const halfH = this._free.distance * 0.5;
    const halfW = halfH * aspect;
    this._freeOrthoCamera.left = -halfW;
    this._freeOrthoCamera.right = halfW;
    this._freeOrthoCamera.top = halfH;
    this._freeOrthoCamera.bottom = -halfH;
    this._freeOrthoCamera.position.copy(camPos);
    this._freeOrthoCamera.lookAt(this._free.focal.x, this._free.focal.y, this._free.focal.z);
    this._freeOrthoCamera.updateProjectionMatrix();
  }

  // ── Free View interactions ───────────────────────────────

  /** Orbit around focal point. dx/dy in pixels. */
  orbit(dxPx: number, dyPx: number, invert = false): void {
    const sx = invert ? -1 : 1;
    const sy = invert ? -1 : 1;
    // Sensitivity: 500px drag → π rad rotation
    const scale = Math.PI / 500;
    this._free.yaw   -= dxPx * scale * sx;
    this._free.pitch += dyPx * scale * sy;
    this._free.pitch = clamp(this._free.pitch, -PITCH_LIMIT, PITCH_LIMIT);
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  /** Pan focal point along camera right/up axes. dx/dy in pixels. */
  pan(dxPx: number, dyPx: number, invert = false): void {
    const sx = invert ? -1 : 1;
    const sy = invert ? -1 : 1;
    // World units per pixel — scaled by distance so pan feels consistent at any zoom
    const worldPerPx = this._free.distance / this._viewportH;
    // Camera basis vectors
    const cam = this._freeCamera;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up    = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    this._free.focal.x += (-dxPx * sx * right.x + dyPx * sy * up.x) * worldPerPx;
    this._free.focal.y += (-dxPx * sx * right.y + dyPx * sy * up.y) * worldPerPx;
    this._free.focal.z += (-dxPx * sx * right.z + dyPx * sy * up.z) * worldPerPx;
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  /** Dolly (move camera toward/away from focal point). positive delta = out. */
  dolly(delta: number, invert = false): void {
    const sign = invert ? -1 : 1;
    // Exponential zoom so scroll feels linear
    const factor = Math.pow(1.15, delta * sign);
    this._free.distance = clamp(this._free.distance * factor, 1, 100000);
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  /** Move focal point + camera together (WASD flight in Free View) */
  translateFocalWorld(dx: number, dy: number, dz: number): void {
    this._free.focal.x += dx;
    this._free.focal.y += dy;
    this._free.focal.z += dz;
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  /**
   * Get camera's local forward/right/up unit vectors in world space.
   * Used by WASD flight to translate along view axes.
   */
  getCameraBasis(): { forward: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3 } {
    const cam = this._freeCamera;
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).normalize();
    return { forward, right, up };
  }

  /** Snap Free View to axis-aligned view. Preserves distance & focal. */
  snapToAxisView(axis: '+x' | '-x' | '+y' | '-y' | '+z' | '-z' | 'reset'): void {
    switch (axis) {
      case '+x': this._free.pitch = 0; this._free.yaw =  Math.PI / 2; break;
      case '-x': this._free.pitch = 0; this._free.yaw = -Math.PI / 2; break;
      case '+y': this._free.pitch =  PITCH_LIMIT; this._free.yaw = 0; break;
      case '-y': this._free.pitch = -PITCH_LIMIT; this._free.yaw = 0; break;
      case '+z': this._free.pitch = 0; this._free.yaw = 0; break;
      case '-z': this._free.pitch = 0; this._free.yaw = Math.PI; break;
      case 'reset':
        this._free.pitch = 0.3; this._free.yaw = 0.5;
        this._free.distance = 1500;
        this._free.focal = { x: 0, y: 0, z: 0 };
        break;
    }
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  /** Toggle Free View between perspective and orthographic (Numpad 5) */
  toggleFreeOrthographic(): void {
    this._free.orthographic = !this._free.orthographic;
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  /** Re-center focal point on a world-space position (Numpad .) */
  centerFocalOn(x: number, y: number, z: number, keepDistance = true): void {
    if (!keepDistance) this._free.distance = 1500;
    this._free.focal = { x, y, z };
    this._recomputeFreeCamera();
    this._persistFree();
    emitCameraChange();
  }

  // ── For UI + overlays ────────────────────────────────────

  /** Get world-space camera position (for frustum/gizmo overlays) */
  getFreeCameraWorldPosition(): THREE.Vector3 {
    return this._computeCameraPosition();
  }
}

/** Singleton — one controller per app (attached to the active comp) */
export const cameraController = new CameraController();