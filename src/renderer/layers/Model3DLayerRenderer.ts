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

  constructor(
    id: string,
    modelUrlOrData:
      | string
      | { url?: string; fileName?: string; scene?: THREE.Group },
  ) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0,
    });
    super(id, geo, mat);
    this.mesh.visible = false;

    if (typeof modelUrlOrData === 'string') {
      this._modelUrl = modelUrlOrData;
    } else {
      this._modelUrl = modelUrlOrData.url ?? '';
      if (modelUrlOrData.scene) {
        this.setModel(modelUrlOrData.scene);
      }
    }
  }

  setModel(scene: THREE.Group): void {
    // Fix #1 — dispose old model materials AND geometries properly.
    // Old code disposed geometry but only checked instanceof Material,
    // missing array materials entirely.
    if (this._modelGroup) {
      this.group.remove(this._modelGroup);
      this._disposeGroup(this._modelGroup);
      this._modelGroup = null;
    }

    this._modelGroup = scene;
    this.group.add(scene);

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.visible = true;
      child.frustumCulled = false;

      // Fix #2 — material replacement was dropping all existing PBR
      // properties by hardcoding roughness/metalness. Only replace if
      // truly incompatible (not MeshStandardMaterial or sub-class).
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      child.material = mats.map((oldMat) => {
        if (oldMat instanceof THREE.MeshStandardMaterial) {
          // Already PBR — just ensure it is visible
          oldMat.visible = true;
          if (oldMat.opacity === undefined || oldMat.opacity <= 0) {
            oldMat.opacity = 1;
            oldMat.transparent = false;
          }
          oldMat.needsUpdate = true;
          return oldMat;
        }

        // Replace non-PBR material
        const newMat = new THREE.MeshStandardMaterial({
          color:
            (oldMat as any).color instanceof THREE.Color
              ? (oldMat as any).color.clone()
              : new THREE.Color(0xcccccc),
          map: (oldMat as any).map ?? null,
          normalMap: (oldMat as any).normalMap ?? null,
          roughness: 0.5,
          metalness: 0.1,
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide,
          visible: true,
        });

        if (oldMat instanceof THREE.Material) oldMat.dispose();
        return newMat;
      });

      // Fix #3 — if the mesh ended up with a single-element array,
      // unwrap it so Three.js doesn't do an extra draw call per mesh.
      if (
        Array.isArray(child.material) &&
        child.material.length === 1
      ) {
        child.material = child.material[0];
      }
    });

    // Fix #4 — must call updateMatrixWorld BEFORE computing bounding box
    // or Box3.setFromObject measures stale world matrices.
    scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    this._w = Math.max(1, size.x);
    this._h = Math.max(1, size.y);

    this.mesh.visible = false;
    this.group.updateMatrixWorld(true);
  }

  updateData(data: any): void {
    if (data?.url && data.url !== this._modelUrl) {
      this._modelUrl = data.url;
    }
  }

  override dispose(): void {
    if (this._modelGroup) {
      this.group.remove(this._modelGroup);
      this._disposeGroup(this._modelGroup);
      this._modelGroup = null;
    }
    super.dispose();
  }

  updateAutoRotate(time: number, speed = 1): void {
    if (this._modelGroup) {
      // Fix #5 — rotation.y was set to `time * speed * 0.001`.
      // With time in ms this overflows to huge angles when time is large,
      // causing jitter. Use modulo to keep it in [0, 2π].
      this._modelGroup.rotation.y =
        (time * speed * 0.001) % (Math.PI * 2);
    }
  }

  getWorldBoundingBox(): THREE.Box3 | null {
    if (!this._modelGroup) return super.getWorldBoundingBox();

    this._modelGroup.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this._modelGroup);
    return box.isEmpty() ? null : box;
  }

  getLocalBoundingBox(): THREE.Box3 | null {
    if (!this._modelGroup) return super.getLocalBoundingBox();

    this._modelGroup.updateMatrixWorld(true);

    // Fix #6 — matrixWorld.clone().invert() modifies a clone which is
    // correct, but the previous code did not guard against a singular
    // (degenerate) matrix. Added determinant check.
    const det = this._modelGroup.matrixWorld.determinant();
    if (Math.abs(det) < 1e-10) return null;

    const groupWorldInverse = this._modelGroup.matrixWorld
      .clone()
      .invert();

    const box = new THREE.Box3();

    this._modelGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.geometry) return;

      child.geometry.computeBoundingBox();
      const childBox = child.geometry.boundingBox;
      if (!childBox) return;

      // Fix #7 — reuse a single Vector3 to avoid 8 allocations per mesh
      const corner = new THREE.Vector3();
      const min = childBox.min;
      const max = childBox.max;

      const xs = [min.x, max.x];
      const ys = [min.y, max.y];
      const zs = [min.z, max.z];

      for (const x of xs) {
        for (const y of ys) {
          for (const z of zs) {
            corner
              .set(x, y, z)
              .applyMatrix4(child.matrixWorld)
              .applyMatrix4(groupWorldInverse);
            box.expandByPoint(corner);
          }
        }
      }
    });

    return box.isEmpty() ? null : box;
  }

  getModelGroup(): THREE.Group | null {
    return this._modelGroup;
  }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }

  // Fix #1 helper — handles both single and array materials
  private _disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry?.dispose();

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const m of mats) {
        if (!(m instanceof THREE.Material)) continue;

        // Dispose any texture maps on the material
        const anyM = m as any;
        const mapKeys = [
          'map', 'normalMap', 'roughnessMap', 'metalnessMap',
          'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap',
          'envMap', 'lightMap',
        ];
        for (const key of mapKeys) {
          if (anyM[key] instanceof THREE.Texture) {
            anyM[key].dispose();
          }
        }

        m.dispose();
      }
    });
  }
}