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

    // Apply any scale that was set before the model finished loading
    // (from proxy mesh) to the newly-loaded model group.
    if (this.mesh.scale.x !== 1 || this.mesh.scale.y !== 1 || this.mesh.scale.z !== 1) {
      scene.scale.copy(this.mesh.scale);
      this.mesh.scale.set(1, 1, 1);
    }
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

  /**
   * Return world-space AABB corners of the ACTUAL loaded 3D model, not the
   * invisible proxy box the base class holds. Uses Box3.setFromObject which
   * walks all descendant meshes and accounts for their world matrices, so
   * this always reflects the true visible extent of the model in world space.
   */
  override getWorldAABBCorners(): THREE.Vector3[] | null {
    if (!this._modelGroup) {
      // Model not loaded yet — fall back to base implementation
      return super.getWorldAABBCorners();
    }

    this._modelGroup.updateMatrixWorld(true);
    const worldBox = new THREE.Box3().setFromObject(this._modelGroup);
    if (worldBox.isEmpty()) return null;

    const corners: THREE.Vector3[] = [];
    const xs = [worldBox.min.x, worldBox.max.x];
    const ys = [worldBox.min.y, worldBox.max.y];
    const zs = [worldBox.min.z, worldBox.max.z];

    for (const x of xs) {
      for (const y of ys) {
        for (const z of zs) {
          corners.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    return corners;
  }

  /**
   * Override updateTransform3D so that scale/position/rotation apply to the
   * actual loaded model group instead of the invisible proxy mesh. The base
   * implementation only affects `this.mesh` (a 1x1x1 hidden box), which is
   * why 3D models never respond to scale changes.
   */
  override updateTransform3D(t3d: {
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    anchorPoint: { x: number; y: number; z: number };
    extrusion?: number;
  }): void {
    // Position + rotation on the group (same as base class)
    this.group.position.set(
      t3d.position.x,
      t3d.position.y,
      -t3d.position.z,
    );
    this.group.rotation.set(
      THREE.MathUtils.degToRad(t3d.rotationX),
      THREE.MathUtils.degToRad(t3d.rotationY),
      THREE.MathUtils.degToRad(t3d.rotationZ),
    );

    // Scale + anchor apply to the loaded model group, not the proxy mesh
    const sx = t3d.scale.x / 100 || 0.0001;
    const sy = t3d.scale.y / 100 || 0.0001;
    const sz = t3d.scale.z / 100 || 0.0001;

    if (this._modelGroup) {
      this._modelGroup.scale.set(sx, sy, sz);
      this._modelGroup.position.set(
        -t3d.anchorPoint.x,
        -t3d.anchorPoint.y,
        -t3d.anchorPoint.z,
      );
    } else {
      // Fall back to proxy mesh if model not loaded yet
      this.mesh.scale.set(sx, sy, sz);
      this.mesh.position.set(
        -t3d.anchorPoint.x,
        -t3d.anchorPoint.y,
        -t3d.anchorPoint.z,
      );
    }
  }

  /**
   * Override updateTransform so 2D-style scale also affects the model.
   */
  override updateTransform(transform: {
    position: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number;
    anchorPoint: { x: number; y: number };
  }): void {
    this.group.position.set(
      transform.position.x,
      transform.position.y,
      this.group.position.z,
    );
    this.group.rotation.z = THREE.MathUtils.degToRad(transform.rotation);

    const sx = transform.scale.x / 100 || 0.0001;
    const sy = transform.scale.y / 100 || 0.0001;
    // Keep existing Z scale (from previous transform3D update)
    const sz = this._modelGroup?.scale.z ?? 1;

    if (this._modelGroup) {
      this._modelGroup.scale.set(sx, sy, sz);
      this._modelGroup.position.set(
        -transform.anchorPoint.x,
        -transform.anchorPoint.y,
        this._modelGroup.position.z,
      );
    } else {
      this.mesh.scale.set(sx, sy, 1);
      this.mesh.position.set(
        -transform.anchorPoint.x,
        -transform.anchorPoint.y,
        0,
      );
    }
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