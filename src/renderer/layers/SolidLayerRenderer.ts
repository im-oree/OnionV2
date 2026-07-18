/**
 * SolidLayerRenderer — flat color quad layer.
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { SolidData } from '../../types/layer';

export class SolidLayerRenderer extends BaseLayerRenderer {
  private _width: number;
  private _height: number;

  constructor(id: string, data: SolidData) {
    const geo = new THREE.PlaneGeometry(data.width, data.height);
    const mat = new THREE.MeshBasicMaterial({
      color: data.color,
      depthTest: false,
      transparent: false,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    super(id, geo, mat);
    this._width = data.width;
    this._height = data.height;
  }

  /** Update the solid color */
  setColor(color: string): void {
    (this.material as THREE.MeshBasicMaterial).color.set(color);
  }

  /** Resize the solid geometry */
  setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.geometry.dispose();
    const newGeo = new THREE.PlaneGeometry(width, height);
    this.mesh.geometry = newGeo;
    // Update geometry reference
    (this as any).geometry = newGeo;
  }

  protected geometryWidth(): number {
    return this._width;
  }
  protected geometryHeight(): number {
    return this._height;
  }
}
