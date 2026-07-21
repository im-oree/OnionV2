/**
 * Model3DLayerRenderer — renders imported 3D models (GLTF, OBJ, PLY, STL)
 * as Three.js groups in the scene with full PBR lighting support.
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';

export class Model3DLayerRenderer extends BaseLayerRenderer {
  private _modelGroup: THREE.Group | null = null;
  private _modelUrl = '';
  private _w = 200;
  private _h = 200;

  constructor(id: string, modelUrlOrData: string | { url?: string; fileName?: string; scene?: THREE.Group }) {
    // Start with a placeholder geometry while model loads
    const geo = new THREE.BoxGeometry(1, 1, 1); // Minimal placeholder
    const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0 });
    super(id, geo, mat);
    this.mesh.visible = false; // Hide placeholder

    if (typeof modelUrlOrData === 'string') {
      this._modelUrl = modelUrlOrData;
    } else {
      this._modelUrl = modelUrlOrData.url ?? '';
      if (modelUrlOrData.scene) {
        this.setModel(modelUrlOrData.scene);
      }
    }
  }

  /** Load and display a 3D model from the given scene group */
  setModel(scene: THREE.Group): void {
    // Clean up old model
    if (this._modelGroup) {
      this.group.remove(this._modelGroup);
      this._modelGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
    }

    this._modelGroup = scene;
    this.group.add(scene);

    // Ensure all meshes use MeshStandardMaterial and are visible
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true;
        child.frustumCulled = false; // Don't cull — always render

        if (!(child.material instanceof THREE.MeshStandardMaterial)) {
          const oldMat = child.material;
          child.material = new THREE.MeshStandardMaterial({
            color: (oldMat as any).color?.clone?.() ?? new THREE.Color(0xcccccc),
            map: (oldMat as any).map ?? null,
            normalMap: (oldMat as any).normalMap ?? null,
            roughness: 0.5,
            metalness: 0.1,
            transparent: true,
            side: THREE.DoubleSide,
          });
          if (oldMat instanceof THREE.Material) oldMat.dispose();
        }

        // Ensure material is visible
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.visible = true;
        mat.opacity = mat.opacity ?? 1;
        mat.transparent = mat.opacity < 1;
        mat.needsUpdate = true;
      }
    });

    // Calculate bounds
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    this._w = Math.max(1, size.x);
    this._h = Math.max(1, size.y);

    // Hide the placeholder mesh
    this.mesh.visible = false;

    // Force render update
    this.group.updateMatrixWorld(true);
  }

  updateData(data: any): void {
    if (data?.url && data.url !== this._modelUrl) {
      this._modelUrl = data.url;
      // The actual loading is handled by the Renderer which calls setModel()
    }
  }

  /** Override dispose to clean up the model group */
  dispose(): void {
    if (this._modelGroup) {
      this.group.remove(this._modelGroup);
      this._modelGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      this._modelGroup = null;
    }
    super.dispose();
  }

  /** Rotate the model each frame */
  updateAutoRotate(time: number, speed: number = 1): void {
    if (this._modelGroup) {
      this._modelGroup.rotation.y = time * speed * 0.001;
    }
  }

  /** Override to use the actual model's bounding box instead of the placeholder mesh */
  getWorldBoundingBox(): THREE.Box3 | null {
    if (!this._modelGroup) return super.getWorldBoundingBox();
    this._modelGroup.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this._modelGroup);
    return box.isEmpty() ? null : box;
  }

  /** Get access to the model group for hit testing and selection */
  getModelGroup(): THREE.Group | null { return this._modelGroup; }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }
}
