/**
 * NullLayerRenderer — a layer with no visual content.
 * Renders as a small square outline viewport-only (visible when selected).
 * Used as a parent for organizing/animation groups.
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';

export class NullLayerRenderer extends BaseLayerRenderer {
  constructor(id: string) {
    // Null objects are invisible helper layers — no visual output.
    // We still create a tiny mesh so the selection overlay can find it,
    // but it renders nothing (transparent, zero opacity, no depth write).
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    super(id, geo, mat);
    this.group.renderOrder = -1;
  }

  protected geometryWidth(): number {
    return 1;
  }

  protected geometryHeight(): number {
    return 1;
  }
}
