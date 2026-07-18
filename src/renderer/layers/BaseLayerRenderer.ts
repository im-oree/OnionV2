import * as THREE from 'three';
import type { Transform } from '../../types/layer';

export abstract class BaseLayerRenderer {
  public readonly group: THREE.Group;
  public readonly mesh: THREE.Mesh;
  public readonly id: string;

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.Material;

  constructor(id: string, geometry: THREE.BufferGeometry, material: THREE.Material) {
    this.id = id;
    this.geometry = geometry;
    this.material = material;

    this.group = new THREE.Group();
    this.group.name = id;

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = `${id}_mesh`;
    this.mesh.renderOrder = 1; // J5: render on top of grid (renderOrder=0)
    this.group.add(this.mesh);
  }

  updateTransform(transform: Transform): void {
    this.group.position.set(transform.position.x, transform.position.y, 0);
    this.group.rotation.z = THREE.MathUtils.degToRad(transform.rotation);
    this.mesh.scale.set(transform.scale.x / 100, transform.scale.y / 100, 1);
    this.updateAnchorOffset(transform.anchorPoint);
  }

  protected updateAnchorOffset(anchor: { x: number; y: number }): void {
    this.mesh.position.set(-anchor.x, -anchor.y, 0);
  }

  protected abstract geometryWidth(): number;
  protected abstract geometryHeight(): number;

  updateOpacity(opacity: number): void {
    const mat = this.material as THREE.MeshBasicMaterial;
    if (mat.transparent !== undefined) {
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.group.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
