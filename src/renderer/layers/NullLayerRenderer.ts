/**
 * NullLayerRenderer — a layer with no visual content.
 * Renders as a small square outline viewport-only (visible when selected).
 * Used as a parent for organizing/animation groups.
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';

export class NullLayerRenderer extends BaseLayerRenderer {
  constructor(id: string) {
    const geo = new THREE.PlaneGeometry(10, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    super(id, geo, mat);
    this.group.renderOrder = 0;
  }

  protected geometryWidth(): number {
    return 10;
  }

  protected geometryHeight(): number {
    return 10;
  }
}
