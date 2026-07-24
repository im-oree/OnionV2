import * as THREE from 'three';
import { VIEWPORT_CONFIG } from '../config/viewportConfig';
import { emitCameraChange } from './utils/CameraEvents';
import { cameraController } from './CameraController';

export interface ViewportTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export class CameraManager {
  public readonly camera: THREE.OrthographicCamera;
  public viewportWidth = 1;
  public viewportHeight = 1;

  private _zoom = 1;
  private _panX = 0;
  private _panY = 0;
  private _orbitAngle = 0;
  private compWidth = 1920;
  private compHeight = 1080;
  public onChanged: (() => void) | null = null;

  /** Set when 3D perspective mode is active — overlays use this for correct world↔screen projection. */
  private _perspectiveCamera: THREE.PerspectiveCamera | null = null;
  private _3DMode = false;

  /** Switch CameraManager into 3D perspective projection mode. Pass null to restore 2D orthographic. */
  setPerspectiveCamera(camera: THREE.PerspectiveCamera | null, viewportW?: number, viewportH?: number): void {
    this._perspectiveCamera = camera;
    this._3DMode = camera !== null;
    if (viewportW !== undefined) this.viewportWidth = viewportW;
    if (viewportH !== undefined) this.viewportHeight = viewportH;
    if (camera && viewportW !== undefined && viewportH !== undefined) {
      cameraController.setViewportSize(viewportW, viewportH);
    }
    this.onChanged?.();
    emitCameraChange();
  }

  get is3DMode(): boolean { return this._3DMode; }

  /**
   * Return the active rendering camera. In 3D mode this is either the
   * composition's own perspective camera (Active Camera view) or the
   * Free View orbit camera, depending on CameraController.mode.
   */
  getActiveCamera(): THREE.Camera {
    if (this._3DMode) {
      if (cameraController.isFreeView) return cameraController.freeCamera;
      return this._perspectiveCamera ?? this.camera;
    }
    return this.camera;
  }

  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);
  }

  setCompositionSize(width: number, height: number): void {
    if (this.compWidth === width && this.compHeight === height) return;
    this.compWidth = width;
    this.compHeight = height;
    this.updateProjection();
  }

  setViewportSize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    if (this.viewportWidth === w && this.viewportHeight === h) return;
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.updateProjection();
    // Keep Free View camera in sync with viewport aspect (3D mode only)
    if (this._3DMode) cameraController.setViewportSize(w, h);
  }

  private updateProjection(): void {
    const aspect = this.viewportWidth / this.viewportHeight;
    const compAspect = this.compWidth / this.compHeight;

    let halfW: number;
    let halfH: number;

    if (aspect > compAspect) {
      halfH = (this.compHeight / 2) / this._zoom;
      halfW = halfH * aspect;
    } else {
      halfW = (this.compWidth / 2) / this._zoom;
      halfH = halfW / aspect;
    }

    this.camera.left = -halfW + this._panX;
    this.camera.right = halfW + this._panX;
    this.camera.top = halfH + this._panY;
    this.camera.bottom = -halfH + this._panY;
    this.camera.updateProjectionMatrix();
    this.onChanged?.();
    emitCameraChange();
  }

  get zoom(): number { return this._zoom; }

  setZoom(zoom: number): void {
    this._zoom = Math.max(VIEWPORT_CONFIG.MIN_ZOOM, Math.min(VIEWPORT_CONFIG.MAX_ZOOM, zoom));
    this.updateProjection();
  }

  zoomIn(factor = 1.25): void { this.setZoom(this._zoom * factor); }
  zoomOut(factor = 1.25): void { this.setZoom(this._zoom / factor); }

  fitToComposition(): void {
    // N11: Add 10% margin around composition for breathing room
    this._zoom = 0.9;
    this._panX = 0;
    this._panY = 0;
    this.updateProjection();
  }

  zoomTo100Percent(): void {
    const zoomX = this.viewportWidth / this.compWidth;
    const zoomY = this.viewportHeight / this.compHeight;
    this.setZoom(Math.min(zoomX, zoomY));
  }

  pan(deltaX: number, deltaY: number): void {
    this._panX += deltaX;
    this._panY += deltaY;
    this.updateProjection();
  }

  setPan(x: number, y: number): void {
    this._panX = x;
    this._panY = y;
    this.updateProjection();
  }

  get panX(): number { return this._panX; }
  get panY(): number { return this._panY; }

  getViewportTransform(): ViewportTransform {
    return { panX: this._panX, panY: this._panY, zoom: this._zoom };
  }

  /**
   * Convert screen pixel coordinates to world space.
   * In 3D mode, shoots a ray from the perspective camera through the screen point
   * and returns its intersection with the z=0 plane.
   */
  screenToWorld(screenX: number, screenY: number): THREE.Vector2 {
    if (this._perspectiveCamera) {
      // Convert screen to NDC
      const ndcX = (screenX / this.viewportWidth) * 2 - 1;
      const ndcY = -(screenY / this.viewportHeight) * 2 + 1;
      const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
      vec.unproject(this._perspectiveCamera);
      // Ray from camera through this NDC point
      const dir = vec.clone().sub(this._perspectiveCamera.position).normalize();
      // Intersect with z=0 plane
      // Plane equation: P = cameraPos + t * dir, want P.z = 0
      // t = -cameraPos.z / dir.z
      if (Math.abs(dir.z) < 1e-10) {
        // Ray is parallel to z=0 — project onto camera's focal plane
        const focalPoint = this._perspectiveCamera.position.clone()
          .add(dir.clone().multiplyScalar(this._perspectiveCamera.far / 2));
        return new THREE.Vector2(focalPoint.x, focalPoint.y);
      }
      const t = -this._perspectiveCamera.position.z / dir.z;
      const hitX = this._perspectiveCamera.position.x + dir.x * t;
      const hitY = this._perspectiveCamera.position.y + dir.y * t;
      return new THREE.Vector2(hitX, hitY);
    }
    // Orthographic projection (2D mode)
    const ndcX = (screenX / this.viewportWidth) * 2 - 1;
    const ndcY = -(screenY / this.viewportHeight) * 2 + 1;
    const halfW = (this.camera.right - this.camera.left) / 2;
    const halfH = (this.camera.top - this.camera.bottom) / 2;
    const cx = (this.camera.left + this.camera.right) / 2;
    const cy = (this.camera.top + this.camera.bottom) / 2;
    return new THREE.Vector2(ndcX * halfW + cx, ndcY * halfH + cy);
  }

  /**
   * Convert world coordinates to screen pixels.
   * In 3D mode, uses the perspective camera's projection so Z depth
   * affects the screen position (perspective foreshortening).
   */
  worldToScreen(worldX: number, worldY: number, worldZ: number = 0): THREE.Vector2 {
    if (this._perspectiveCamera) {
      const vec = new THREE.Vector3(worldX, worldY, worldZ);
      vec.project(this._perspectiveCamera);
      // Guard against Infinity from points behind the camera (z > 1 after project)
      // or points at extreme distances. Return a large off-screen value instead.
      if (!isFinite(vec.x) || !isFinite(vec.y) || vec.z > 1) {
        // Guaranteed off-screen: negative so it's always outside [0, viewport]
        const offscreen = -Math.max(this.viewportWidth, this.viewportHeight) * 2;
        return new THREE.Vector2(offscreen, offscreen);
      }
      const screenX = (vec.x * 0.5 + 0.5) * this.viewportWidth;
      const screenY = (-vec.y * 0.5 + 0.5) * this.viewportHeight;
      return new THREE.Vector2(screenX, screenY);
    }
    // Orthographic projection (2D mode)
    const halfW = (this.camera.right - this.camera.left) / 2;
    const halfH = (this.camera.top - this.camera.bottom) / 2;
    const cx = (this.camera.left + this.camera.right) / 2;
    const cy = (this.camera.top + this.camera.bottom) / 2;
    const ndcX = (worldX - cx) / halfW;
    const ndcY = (worldY - cy) / halfH;
    const screenX = (ndcX + 1) / 2 * this.viewportWidth;
    const screenY = (1 - ndcY) / 2 * this.viewportHeight;
    return new THREE.Vector2(screenX, screenY);
  }

  /**
   * Safe variant of worldToScreen that returns null instead of off-screen sentinel
   * values when the projection fails or the point is behind the camera.
   *
   * Overlay components that need to skip rendering entirely (rather than render
   * off-screen) should use this method. Callers can differentiate:
   *   null      → behind camera or projection error → skip rendering
   *   Vector2   → on-screen → render normally
   */
  worldToScreenSafe(worldX: number, worldY: number, worldZ: number = 0): THREE.Vector2 | null {
    try {
      const result = this.worldToScreen(worldX, worldY, worldZ);
      // worldToScreen returns an off-screen sentinel for behind-camera points
      // (both coords negative and larger than the viewport). Treat that as null.
      const sentinel = -Math.max(this.viewportWidth, this.viewportHeight) * 2;
      if (result.x === sentinel && result.y === sentinel) return null;
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Test whether a world-space point is behind the perspective camera.
   * In 2D orthographic mode this always returns false (no depth clipping).
   * In 3D perspective mode, projects the point and checks if its NDC z > 1
   * (behind the camera's far plane) or if the projection produced non-finite values.
   *
   * Usage: compositors and overlays can call this to skip processing entirely
   * when a layer or marker is behind the camera.
   */
  isBehindCamera(worldX: number, worldY: number, worldZ: number = 0): boolean {
    if (!this._perspectiveCamera) return false; // orthographic — nothing is behind
    const vec = new THREE.Vector3(worldX, worldY, worldZ);
    vec.project(this._perspectiveCamera);
    return !isFinite(vec.x) || !isFinite(vec.y) || vec.z > 1;
  }

  get orbitAngle(): number { return this._orbitAngle; }

  setOrbitAngle(angle: number): void {
    this._orbitAngle = angle;
    this.onChanged?.();
    emitCameraChange();
  }

  orbit(deltaAngle: number): void {
    this._orbitAngle += deltaAngle;
    this.onChanged?.();
    emitCameraChange();
  }

  dispose(): void {}
}