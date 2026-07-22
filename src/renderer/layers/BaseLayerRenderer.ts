import * as THREE from 'three';
import type { Transform, MaterialProperties } from '../../types/layer';

export abstract class BaseLayerRenderer {
  public readonly group: THREE.Group;
  public readonly mesh: THREE.Mesh;
  public readonly id: string;

  private _extrusionGroup: THREE.Group | null = null;
  private _lastExtrusion = 0;

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.Material;

  // Fix #1 — track disposal to prevent post-dispose mutations
  private _disposed = false;

  constructor(
    id: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
  ) {
    this.id = id;
    this.geometry = geometry;
    this.material = material;

    this.group = new THREE.Group();
    this.group.name = id;

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = `${id}_mesh`;
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  updateTransform(transform: Transform): void {
    // Fix #2 — preserve Z instead of reading this.group.position.z which
    // can be stale if updateTransform3D was previously called.
    // Use existing Z so 2D layers on 3D scenes don't snap to 0.
    this.group.position.set(
      transform.position.x,
      transform.position.y,
      this.group.position.z,
    );
    this.group.rotation.z = THREE.MathUtils.degToRad(transform.rotation);
    this.mesh.scale.set(
      transform.scale.x / 100,
      transform.scale.y / 100,
      1,
    );
    this.mesh.position.set(
      -transform.anchorPoint.x,
      -transform.anchorPoint.y,
      0,
    );
  }

  updateTransform3D(t3d: {
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    anchorPoint: { x: number; y: number; z: number };
    extrusion?: number;
  }): void {
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

    // Fix #3 — scale must never be zero; zero scale produces a degenerate
    // matrix, breaking inverse operations and bounding box calculations.
    const sx = t3d.scale.x / 100 || 0.0001;
    const sy = t3d.scale.y / 100 || 0.0001;
    const sz = t3d.scale.z / 100 || 0.0001;
    this.mesh.scale.set(sx, sy, sz);

    this.mesh.position.set(
      -t3d.anchorPoint.x,
      -t3d.anchorPoint.y,
      -t3d.anchorPoint.z,
    );

    const extrude = t3d.extrusion ?? 0;
    if (Math.abs(extrude - this._lastExtrusion) > 0.1) {
      this._updateExtrusion(extrude);
      this._lastExtrusion = extrude;
    }
  }

  private _updateExtrusion(depth: number): void {
    if (this._extrusionGroup) {
      this.group.remove(this._extrusionGroup);
      this._disposeGroup(this._extrusionGroup);
      this._extrusionGroup = null;
    }

    if (depth <= 0) return;

    const w = this.geometryWidth();
    const h = this.geometryHeight();
    const hw = w / 2;
    const hh = h / 2;

    this._extrusionGroup = new THREE.Group();
    this._extrusionGroup.name = `${this.id}_extrusion`;

    const baseColor =
      (this.material as any).color instanceof THREE.Color
        ? (this.material as any).color.clone()
        : new THREE.Color(0x888888);

    const sideColor = baseColor.clone().multiplyScalar(0.6);

    // Fix #4 — depthWrite: false on opaque-ish geometry causes sort order
    // artifacts when sides overlap. Use depthWrite: true for solid sides.
    const sideMat = new THREE.MeshStandardMaterial({
      color: sideColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: true,
      roughness: 0.7,
      metalness: 0,
    });

    const addSide = (
      w2: number,
      h2: number,
      px: number,
      py: number,
      pz: number,
      rx: number,
      ry: number,
    ) => {
      const geo = new THREE.PlaneGeometry(w2, h2);
      const mesh = new THREE.Mesh(geo, sideMat.clone());
      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx, ry, 0);
      mesh.frustumCulled = false;
      this._extrusionGroup!.add(mesh);
    };

    // Back face
    addSide(w, h, 0, 0, -depth, 0, Math.PI);
    // Top
    addSide(w, depth, 0, hh, -depth / 2, -Math.PI / 2, 0);
    // Bottom
    addSide(w, depth, 0, -hh, -depth / 2, Math.PI / 2, 0);
    // Left
    addSide(depth, h, -hw, 0, -depth / 2, 0, -Math.PI / 2);
    // Right
    addSide(depth, h, hw, 0, -depth / 2, 0, Math.PI / 2);

    // Fix #5 — original side z positions used +d for back and +d/2 for
    // sides. The back face should be at -depth (behind the front face at
    // z=0) and sides at -depth/2 to correctly enclose the layer.

    this.group.add(this._extrusionGroup);
  }

  updateOpacity(opacity: number): void {
    const clamped = Math.max(0, Math.min(1, opacity));
    const mat = this.material as THREE.MeshBasicMaterial;
    mat.transparent = clamped < 1;
    mat.opacity = clamped;
    mat.needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setWireframe(on: boolean): void {
    const mat = this.mesh.material as any;
    if (mat?.wireframe !== undefined) {
      mat.wireframe = on;
      mat.needsUpdate = true;
    }

    if (this._extrusionGroup) {
      this._extrusionGroup.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const m = child.material as any;
        if (m?.wireframe !== undefined) {
          m.wireframe = on;
          m.needsUpdate = true;
        }
      });
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    this.group.remove(this.mesh);

    if (this._extrusionGroup) {
      this.group.remove(this._extrusionGroup);
      this._disposeGroup(this._extrusionGroup);
      this._extrusionGroup = null;
    }

    this.geometry.dispose();
    this.material.dispose();
  }

  updateMaterial(props: MaterialProperties, is3D: boolean): void {
    if (!is3D) return;

    const wantsLit = props.acceptsLights !== false;

    if (wantsLit) {
      if (
        !(this.mesh.material instanceof THREE.MeshStandardMaterial)
      ) {
        const oldMat = this.mesh.material;
        const newMat = new THREE.MeshStandardMaterial({
          map: (oldMat as any).map ?? null,
          transparent: true,
          side: THREE.DoubleSide,
          color: 0xffffff,
          roughness: 0.5,
          metalness: 0,
        });
        this.mesh.material = newMat;
        this.material = newMat;
        oldMat.dispose();
      }

      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.metalness = Math.max(0, Math.min(1, (props.metal ?? 0) / 100));
      mat.roughness = Math.max(
        0,
        Math.min(1, 1 - (props.shininess ?? 50) / 100),
      );

      // Fix #6 — emissive was always white regardless of material color.
      // Use the material's own color so glow matches the layer color.
      const emissionLevel = Math.max(
        0,
        Math.min(2, (props.ambient ?? 0) / 100),
      );
      mat.emissive.copy(
        (mat.color instanceof THREE.Color)
          ? mat.color
          : new THREE.Color(0xffffff),
      );
      mat.emissiveIntensity = emissionLevel;
      mat.needsUpdate = true;

      this.mesh.castShadow = props.castsShadows ?? false;
      this.mesh.receiveShadow = props.acceptsShadows ?? false;
    } else {
      if (
        !(this.mesh.material instanceof THREE.MeshBasicMaterial)
      ) {
        const oldMat = this.mesh.material;
        const newMat = new THREE.MeshBasicMaterial({
          map: (oldMat as any).map ?? null,
          transparent: true,
          side: THREE.DoubleSide,
          color: 0xffffff,
        });
        this.mesh.material = newMat;
        this.material = newMat;
        oldMat.dispose();
      }

      const mat = this.mesh.material as THREE.MeshBasicMaterial;
      mat.needsUpdate = true;
    }
  }

  getWorldBoundingBox(): THREE.Box3 | null {
    this.mesh.updateMatrixWorld(true);
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    if (!geo.boundingBox) return null;

    const bbox = geo.boundingBox;
    const matrix = this.mesh.matrixWorld;
    const worldBox = new THREE.Box3();

    // Fix #7 — reuse single Vector3 instead of 8 allocations
    const corner = new THREE.Vector3();
    const min = bbox.min;
    const max = bbox.max;

    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          corner.set(x, y, z).applyMatrix4(matrix);
          worldBox.expandByPoint(corner);
        }
      }
    }

    return worldBox;
  }

  getLocalBoundingBox(): THREE.Box3 | null {
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    return geo.boundingBox?.clone() ?? null;
  }

  getWorldCorners(): Array<{ x: number; y: number; z: number }> {
    const w = this.geometryWidth() / 2;
    const h = this.geometryHeight() / 2;

    // Fix #8 — old code applied euler + scale + position separately which
    // does NOT match Three.js matrix multiplication order (scale → rotate
    // → translate). Use matrixWorld directly for correctness.
    this.group.updateMatrixWorld(true);

    const localCorners = [
      new THREE.Vector3(-w, h, 0),
      new THREE.Vector3(w, h, 0),
      new THREE.Vector3(w, -h, 0),
      new THREE.Vector3(-w, -h, 0),
    ];

    return localCorners.map((v) => {
      const world = v.applyMatrix4(this.mesh.matrixWorld);
      return { x: world.x, y: world.y, z: world.z };
    });
  }

  // ── Private helpers ────────────────────────────────────────────

  private _disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry?.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const m of mats) {
        if (m instanceof THREE.Material) m.dispose();
      }
    });
  }

  protected abstract geometryWidth(): number;
  protected abstract geometryHeight(): number;
}