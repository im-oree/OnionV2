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
    this.mesh.renderOrder = 1;
    // Enable frustum culling so objects outside the viewport aren't rendered (saves GPU)
    this.mesh.frustumCulled = true;
    this.group.add(this.mesh);
  }

  updateTransform(transform: Transform): void {
    // Position: world units, direct
    this.group.position.set(transform.position.x, transform.position.y, this.group.position.z);
    // Rotation: degrees → radians, positive = CCW in Y-up
    this.group.rotation.z = THREE.MathUtils.degToRad(transform.rotation);
    // FIX: scale is stored as percentage (100 = 100%), convert to 0-1
    this.mesh.scale.set(transform.scale.x / 100, transform.scale.y / 100, 1);
    // Anchor offset: applied to mesh position within the group
    this.mesh.position.set(-transform.anchorPoint.x, -transform.anchorPoint.y, 0);
  }

  updateOpacity(opacity: number): void {
    const mat = this.material as THREE.MeshBasicMaterial;
    mat.transparent = opacity < 1;
    mat.opacity = opacity;
    mat.needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.group.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }

  protected abstract geometryWidth(): number;
  protected abstract geometryHeight(): number;
}