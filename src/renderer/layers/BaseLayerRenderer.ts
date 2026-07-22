import * as THREE from 'three';
import type { Transform, MaterialProperties } from '../../types/layer';

export abstract class BaseLayerRenderer {
  public readonly group: THREE.Group;
  public readonly mesh: THREE.Mesh;
  public readonly id: string;
  /** Extrusion side meshes (created when extrusion > 0) */
  private _extrusionGroup: THREE.Group | null = null;
  private _lastExtrusion = 0;

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
    // Disable frustum culling to prevent objects from disappearing
    // when orbiting/rotating the 3D view. Three.js frustum culling
    // uses the bounding sphere which can be inaccurate for rotated planes.
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  updateTransform(transform: Transform): void {
    this.group.position.set(transform.position.x, transform.position.y, this.group.position.z);
    this.group.rotation.z = THREE.MathUtils.degToRad(transform.rotation);
    this.mesh.scale.set(transform.scale.x / 100, transform.scale.y / 100, 1);
    this.mesh.position.set(-transform.anchorPoint.x, -transform.anchorPoint.y, 0);
  }

  /**
   * Update 3D transform from transform3D data.
   * Handles full 3D position, rotation, scale, and extrusion.
   */
  updateTransform3D(t3d: {
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    rotationX: number; rotationY: number; rotationZ: number;
    anchorPoint: { x: number; y: number; z: number };
    extrusion?: number;
  }): void {
    this.group.position.set(
      t3d.position.x,
      t3d.position.y,
      -t3d.position.z, // Z is negative because Three.js Z goes toward camera
    );
    this.group.rotation.set(
      THREE.MathUtils.degToRad(t3d.rotationX),
      THREE.MathUtils.degToRad(t3d.rotationY),
      THREE.MathUtils.degToRad(t3d.rotationZ),
    );
    this.mesh.scale.set(
      t3d.scale.x / 100,
      t3d.scale.y / 100,
      t3d.scale.z / 100,
    );
    this.mesh.position.set(-t3d.anchorPoint.x, -t3d.anchorPoint.y, -t3d.anchorPoint.z);

    // Handle extrusion
    const extrude = t3d.extrusion ?? 0;
    if (Math.abs(extrude - this._lastExtrusion) > 0.1) {
      this._updateExtrusion(extrude);
      this._lastExtrusion = extrude;
    }
  }

  /**
   * Create extrusion sides when extrusion > 0.
   * Converts the flat plane into a 3D box with the layer texture on front.
   */
  private _updateExtrusion(depth: number): void {
    // Remove old extrusion
    if (this._extrusionGroup) {
      this.group.remove(this._extrusionGroup);
      this._extrusionGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this._extrusionGroup = null;
    }

    if (depth <= 0) return;

    const w = this.geometryWidth();
    const h = this.geometryHeight();
    const d = depth;
    const hw = w / 2;
    const hh = h / 2;

    this._extrusionGroup = new THREE.Group();
    this._extrusionGroup.name = `${this.id}_extrusion`;

    // Side color (darker version of the material color)
    const baseColor = (this.material as any).color?.clone() ?? new THREE.Color(0x888888);
    const sideColor = baseColor.clone().multiplyScalar(0.6);

    const sideMat = new THREE.MeshBasicMaterial({
      color: sideColor, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, depthWrite: false,
    });

    // Back face
    const backGeo = new THREE.PlaneGeometry(w, h);
    const backMesh = new THREE.Mesh(backGeo, sideMat.clone());
    backMesh.position.z = d;
    this._extrusionGroup.add(backMesh);

    // Top side
    const topGeo = new THREE.PlaneGeometry(w, d);
    const topMesh = new THREE.Mesh(topGeo, sideMat.clone());
    topMesh.position.set(0, hh, d / 2);
    topMesh.rotation.x = Math.PI / 2;
    this._extrusionGroup.add(topMesh);

    // Bottom side
    const bottomGeo = new THREE.PlaneGeometry(w, d);
    const bottomMesh = new THREE.Mesh(bottomGeo, sideMat.clone());
    bottomMesh.position.set(0, -hh, d / 2);
    bottomMesh.rotation.x = -Math.PI / 2;
    this._extrusionGroup.add(bottomMesh);

    // Left side
    const leftGeo = new THREE.PlaneGeometry(d, h);
    const leftMesh = new THREE.Mesh(leftGeo, sideMat.clone());
    leftMesh.position.set(-hw, 0, d / 2);
    leftMesh.rotation.y = Math.PI / 2;
    this._extrusionGroup.add(leftMesh);

    // Right side
    const rightGeo = new THREE.PlaneGeometry(d, h);
    const rightMesh = new THREE.Mesh(rightGeo, sideMat.clone());
    rightMesh.position.set(hw, 0, d / 2);
    rightMesh.rotation.y = -Math.PI / 2;
    this._extrusionGroup.add(rightMesh);

    this.group.add(this._extrusionGroup);
  }

  updateOpacity(opacity: number): void {
    const mat = this.material as THREE.MeshBasicMaterial;
    mat.transparent = true;
    mat.opacity = opacity;
    mat.needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** Toggle wireframe rendering on the mesh material */
  setWireframe(on: boolean): void {
    const mat = this.mesh.material as any;
    if (mat && mat.wireframe !== undefined) {
      mat.wireframe = on;
      mat.needsUpdate = true;
    }
    // Also apply to extrusion side meshes
    if (this._extrusionGroup) {
      this._extrusionGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const m = child.material as any;
          if (m && m.wireframe !== undefined) {
            m.wireframe = on;
            m.needsUpdate = true;
          }
        }
      });
    }
  }

  dispose(): void {
    this.group.remove(this.mesh);
    if (this._extrusionGroup) {
      this.group.remove(this._extrusionGroup);
      this._extrusionGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
    this.geometry.dispose();
    this.material.dispose();
  }

  updateMaterial(props: MaterialProperties, is3D: boolean): void {
    if (!is3D) return;

    // acceptsLights controls lit vs unlit:
    //   true  → MeshStandardMaterial (responds to scene lights)
    //   false → MeshBasicMaterial (flat/unlit, ignores lights)
    const wantsLit = props.acceptsLights !== false;

    if (wantsLit) {
      // Ensure we have a MeshStandardMaterial
      if (!(this.mesh.material instanceof THREE.MeshStandardMaterial)) {
        const oldMat = this.mesh.material;
        const map = (oldMat as any).map;
        const newMat = new THREE.MeshStandardMaterial({
          map: map ?? null,
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
      mat.metalness = (props.metal ?? 0) / 100;
      mat.roughness = 1 - ((props.shininess ?? 50) / 100);
      // Emission — white glow scaled by emission intensity (0-200)
      const emissionLevel = Math.max(0, (props.ambient ?? 0)) / 100;
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = emissionLevel;
      mat.needsUpdate = true;
      this.mesh.castShadow = props.castsShadows;
      this.mesh.receiveShadow = props.acceptsShadows;
    } else {
      // Unlit — switch to MeshBasicMaterial
      if (!(this.mesh.material instanceof THREE.MeshBasicMaterial)) {
        const oldMat = this.mesh.material;
        const map = (oldMat as any).map;
        const newMat = new THREE.MeshBasicMaterial({
          map: map ?? null,
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

  /** Get the world-space bounding box for selection outline and hit testing.
   *  Override in Model3DLayerRenderer to use the actual model geometry. */
  getWorldBoundingBox(): THREE.Box3 | null {
    this.mesh.updateMatrixWorld(true);
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    if (!geo.boundingBox) return null;
    const bbox = geo.boundingBox;
    const corners = [
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
    ];
    const matrix = this.mesh.matrixWorld;
    const worldBox = new THREE.Box3();
    for (const c of corners) {
      const w = c.applyMatrix4(matrix);
      worldBox.expandByPoint(w);
    }
    return worldBox;
  }

  /** Get the LOCAL-space bounding box (pre-world-transform).
   *  Used by SelectionOverlay to compute oriented bounding box outlines.
   *  Override in Model3DLayerRenderer to use the actual model geometry. */
  getLocalBoundingBox(): THREE.Box3 | null {
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    return geo.boundingBox?.clone() ?? null;
  }

  /** Get the world-space bounding box corners for 3D selection outline */
  getWorldCorners(): Array<{ x: number; y: number; z: number }> {
    const w = this.geometryWidth() / 2;
    const h = this.geometryHeight() / 2;
    const corners = [
      { x: -w, y: h, z: 0 },
      { x: w, y: h, z: 0 },
      { x: w, y: -h, z: 0 },
      { x: -w, y: -h, z: 0 },
    ];

    return corners.map(c => {
      const v = new THREE.Vector3(c.x, c.y, c.z);
      v.applyEuler(this.group.rotation);
      v.multiply(this.mesh.scale);
      v.add(this.group.position);
      v.add(this.mesh.position);
      return { x: v.x, y: v.y, z: v.z };
    });
  }

  protected abstract geometryWidth(): number;
  protected abstract geometryHeight(): number;
}
