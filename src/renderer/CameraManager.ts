import * as THREE from 'three';
import { VIEWPORT_CONFIG } from '../config/viewportConfig';

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
  private compWidth = 1920;
  private compHeight = 1080;
  public onChanged: (() => void) | null = null;

  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);
  }

  setCompositionSize(width: number, height: number): void {
    this.compWidth = width;
    this.compHeight = height;
    this.updateProjection();
  }

  setViewportSize(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.updateProjection();
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
  }

  get zoom(): number { return this._zoom; }

  setZoom(zoom: number): void {
    this._zoom = Math.max(VIEWPORT_CONFIG.MIN_ZOOM, Math.min(VIEWPORT_CONFIG.MAX_ZOOM, zoom));
    this.updateProjection();
  }

  zoomIn(factor = 1.25): void { this.setZoom(this._zoom * factor); }
  zoomOut(factor = 1.25): void { this.setZoom(this._zoom / factor); }

  fitToComposition(): void {
    this._zoom = 1;
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

  screenToWorld(screenX: number, screenY: number): THREE.Vector2 {
    const ndcX = (screenX / this.viewportWidth) * 2 - 1;
    const ndcY = -(screenY / this.viewportHeight) * 2 + 1;
    const halfW = (this.camera.right - this.camera.left) / 2;
    const halfH = (this.camera.top - this.camera.bottom) / 2;
    const cx = (this.camera.left + this.camera.right) / 2;
    const cy = (this.camera.top + this.camera.bottom) / 2;
    return new THREE.Vector2(ndcX * halfW + cx, ndcY * halfH + cy);
  }

  worldToScreen(worldX: number, worldY: number): THREE.Vector2 {
    const halfW = (this.camera.right - this.camera.left) / 2;
    const halfH = (this.camera.top - this.camera.bottom) / 2;
    const cx = (this.camera.left + this.camera.right) / 2;
    const cy = (this.camera.top + this.camera.bottom) / 2;
    // FIX: NDC x = (worldX - cx) / halfW, NDC y = (worldY - cy) / halfH
    // screen x = (ndcX + 1) / 2 * width
    // screen y = (1 - ndcY) / 2 * height  <-- Y is flipped: NDC +Y is screen top
    const ndcX = (worldX - cx) / halfW;
    const ndcY = (worldY - cy) / halfH;
    const screenX = (ndcX + 1) / 2 * this.viewportWidth;
    const screenY = (1 - ndcY) / 2 * this.viewportHeight;
    return new THREE.Vector2(screenX, screenY);
  }

  dispose(): void {}
}