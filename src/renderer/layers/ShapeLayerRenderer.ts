import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { ShapeData } from '../../types/layer';

export class ShapeLayerRenderer extends BaseLayerRenderer {
  private _width: number;
  private _height: number;

  constructor(id: string, data: ShapeData, fillColor = '#ffffff') {
    const w = 'width' in data ? data.width : ('radiusX' in data ? data.radiusX * 2 : data.radius * 2);
    const h = 'height' in data ? data.height : ('radiusY' in data ? data.radiusY * 2 : data.radius * 2);
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: fillColor,
      depthTest: false,
      transparent: false,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    super(id, geo, mat);
    this._width = w;
    this._height = h;
  }

  setFillColor(color: string): void {
    (this.material as THREE.MeshBasicMaterial).color.set(color);
  }

  setSize(width: number, height: number): void {
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
