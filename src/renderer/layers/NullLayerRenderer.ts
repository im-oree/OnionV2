/**
 * NullLayerRenderer — a wireframe box helper for Null objects in 3D space.
 * Used as controllers for cameras, parenting, and animation groups.
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';

export class NullLayerRenderer extends BaseLayerRenderer {
  constructor(id: string) {
    // Null objects are invisible — just a transform anchor with no visual output
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    super(id, geo, mat);
    this.mesh.visible = false;
  }

  protected geometryWidth() { return 0; }
  protected geometryHeight() { return 0; }
}
