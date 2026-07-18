import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';

export class CompLayerRenderer extends BaseLayerRenderer {
  private _width: number;
  private _height: number;

  constructor(id: string, width: number, height: number, texture: THREE.Texture) {
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    super(id, geo, mat);
    this._width = width;
    this._height = height;
  }

  setTexture(texture: THREE.Texture): void {
    const mat = this.material as THREE.MeshBasicMaterial;
    if (mat.map !== texture) {
      mat.map = texture;
      mat.needsUpdate = true;
    }
  }

  setSize(width: number, height: number): void {
    if (this._width === width && this._height === height) return;
    this._width = width;
    this._height = height;
    this.geometry.dispose();
    const newGeo = new THREE.PlaneGeometry(width, height);
    this.mesh.geometry = newGeo;
    (this as any).geometry = newGeo;
  }

  protected geometryWidth(): number { return this._width; }
  protected geometryHeight(): number { return this._height; }
}