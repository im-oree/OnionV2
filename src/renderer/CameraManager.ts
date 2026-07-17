/**
 * CameraManager — manages an OrthographicCamera for 2D viewport.
 * Supports pan (middle-mouse drag) and zoom (scroll).
 * Y-UP coordinate system (Blender-style).
 */
import * as THREE from 'three';

export interface ViewportTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export class CameraManager {
  public readonly camera: THREE.OrthographicCamera;
  /** Current zoom level (1 = 100%) */
  private _zoom = 1;
  /** Pan offset in world units */
  private _panX = 0;
  private _panY = 0;
  /** Composition pixel dimensions */
  private compWidth = 1920;
  private compHeight = 1080;
  /** Viewport container pixel dimensions */
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor() {
    // OrthographicCamera: left, right, top, bottom, near, far
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);
  }

  /** Set the composition dimensions (in pixels) */
  setCompositionSize(width: number, height: number): void {
    this.compWidth = width;
    this.compHeight = height;
    this.updateProjection();
  }

  /** Set the viewport container dimensions (in CSS pixels) */
  setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.updateProjection();
  }

  /** Recalculate the camera projection matrix */
  private updateProjection(): void {
    // Fit the composition into the viewport, accounting for zoom
    const aspect = this.viewportWidth / this.viewportHeight;
    const compAspect = this.compWidth / this.compHeight;

    let halfW: number;
    let halfH: number;

    if (aspect > compAspect) {
      // Viewport is wider — match height
      halfH = (this.compHeight / 2) * this._zoom;
      halfW = halfH * aspect;
    } else {
      // Viewport is taller — match width
      halfW = (this.compWidth / 2) * this._zoom;
      halfH = halfW / aspect;
    }

    this.camera.left = -halfW + this._panX;
    this.camera.right = halfW + this._panX;
    this.camera.top = halfH + this._panY;
    this.camera.bottom = -halfH + this._panY;
    this.camera.updateProjectionMatrix();
  }

  /** Get current zoom level */
  get zoom(): number {
    return this._zoom;
  }

  /** Set zoom level, clamped to [0.01, 100] */
  setZoom(zoom: number): void {
    this._zoom = Math.max(0.01, Math.min(100, zoom));
    this.updateProjection();
  }

  /** Zoom in by a factor (e.g., 1.25) */
  zoomIn(factor = 1.25): void {
    this.setZoom(this._zoom / factor);
  }

  /** Zoom out by a factor */
  zoomOut(factor = 1.25): void {
    this.setZoom(this._zoom * factor);
  }

  /** Zoom to fit the composition in the viewport */
  zoomToFit(): void {
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
    this.updateProjection();
  }

  /** Pan the camera by world-space delta */
  pan(deltaX: number, deltaY: number): void {
    this._panX += deltaX;
    this._panY += deltaY;
    this.updateProjection();
  }

  /** Set pan position directly */
  setPan(x: number, y: number): void {
    this._panX = x;
    this._panY = y;
    this.updateProjection();
  }

  /** Get the current viewport transform state (for UI display) */
  getViewportTransform(): ViewportTransform {
    return {
      panX: this._panX,
      panY: this._panY,
      zoom: this._zoom,
    };
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(screenX: number, screenY: number): THREE.Vector2 {
    const ndcX = (screenX / this.viewportWidth) * 2 - 1;
    const ndcY = -(screenY / this.viewportHeight) * 2 + 1;

    const worldX = ndcX * ((this.camera.right - this.camera.left) / 2) + (this.camera.left + this.camera.right) / 2;
    const worldY = ndcY * ((this.camera.top - this.camera.bottom) / 2) + (this.camera.top + this.camera.bottom) / 2;

    return new THREE.Vector2(worldX, worldY);
  }

  /** Dispose camera resources */
  dispose(): void {
    this.camera.projectionMatrix.identity();
  }
}
