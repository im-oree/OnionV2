/**
 * AdjustmentLayerRenderer — a layer with no visual content.
 * Serves as a marker in the layer stack: its effects apply to everything
 * rendered below it (screen space). The actual compositing is done by
 * AdjustmentCompositor from the main Renderer.
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';

export class AdjustmentLayerRenderer extends BaseLayerRenderer {
  private _w: number;
  private _h: number;

  constructor(id: string, compWidth: number, compHeight: number) {
    // Invisible geometry sized to the composition, centered at origin.
    // The AdjustmentCompositor uses the mesh's world bounds to know where
    // to display the composited result, but the mesh itself never renders.
    const geo = new THREE.PlaneGeometry(compWidth, compHeight);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    super(id, geo, mat);
    this._w = compWidth;
    this._h = compHeight;
    this.mesh.visible = false; // never actually rendered as content
    this.group.renderOrder = 0;
  }

  /** Resize to match composition bounds. */
  setCompSize(w: number, h: number): void {
    if (Math.abs(this._w - w) < 0.5 && Math.abs(this._h - h) < 0.5) return;
    this._w = w;
    this._h = h;
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(w, h);
    this.mesh.geometry = this.geometry;
  }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }
}