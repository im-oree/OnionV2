/**
 * LightLayerRenderer — renders Three.js lights (point, spot, directional, ambient)
 * in the scene with full Blender-style properties. Each light gets a visible gizmo
 * (wireframe sphere/cone) in the viewport so it can be selected and dragged.
 */
import * as THREE from 'three';
import type { LightData } from '../../types/layer';

export class LightLayerRenderer {
  public readonly id: string;
  public readonly group: THREE.Group;
  public light: THREE.Light | null = null;
  public gizmo: THREE.Object3D | null = null;

  private _lastType = '';

  constructor(id: string, data: LightData) {
    this.id = id;
    this.group = new THREE.Group();
    this.group.name = id;
    this._buildLight(data);
  }

  updateData(data: LightData): void {
    // Rebuild if type changed, otherwise update properties
    if (data.lightType !== this._lastType) {
      this._buildLight(data);
    } else {
      this._updateLightProps(data);
      this._updateGizmoProps(data);
    }
  }

  /** Build or rebuild the Three.js light and gizmo from data */
  private _buildLight(data: LightData): void {
    // Remove old
    if (this.light) { this.group.remove(this.light); this.light.dispose(); }
    if (this.gizmo) { this.group.remove(this.gizmo); }

    const color = new THREE.Color(data.color ?? '#ffffff');
    const intensity = (data.intensity ?? 100) / 100; // normalize 0-100 to 0-1

    switch (data.lightType) {
      case 'point': {
        const l = new THREE.PointLight(color, intensity * 2, data.falloffDistance ?? 500, 2);
        l.castShadow = data.castsShadows ?? false;
        this.light = l;
        this.gizmo = this._createPointGizmo(data);
        break;
      }
      case 'spot': {
        const l = new THREE.SpotLight(color, intensity * 2, data.falloffDistance ?? 500,
          (data.coneAngle ?? 54) * Math.PI / 180, (data.coneFeather ?? 50) / 100, 2);
        l.castShadow = data.castsShadows ?? false;
        this.light = l;
        this.gizmo = this._createSpotGizmo(data);
        break;
      }
      case 'parallel': {
        const l = new THREE.DirectionalLight(color, intensity * 2);
        l.castShadow = data.castsShadows ?? false;
        l.position.set(500, 500, 500);
        this.light = l;
        this.gizmo = this._createDirGizmo(data);
        break;
      }
      case 'ambient': {
        const l = new THREE.AmbientLight(color, intensity * 2);
        this.light = l;
        this.gizmo = this._createAmbientGizmo(data);
        break;
      }
    }

    this._lastType = data.lightType;
    if (this.light) this.group.add(this.light);
    if (this.gizmo) this.group.add(this.gizmo);
  }

  private _updateLightProps(data: LightData): void {
    if (!this.light) return;
    const color = new THREE.Color(data.color ?? '#ffffff');
    const intensity = (data.intensity ?? 100) / 100;

    this.light.color.copy(color);

    if (this.light instanceof THREE.PointLight) {
      this.light.intensity = intensity * 2;
      this.light.distance = data.falloffDistance ?? 500;
      this.light.castShadow = data.castsShadows ?? false;
    } else if (this.light instanceof THREE.SpotLight) {
      this.light.intensity = intensity * 2;
      this.light.distance = data.falloffDistance ?? 500;
      this.light.angle = (data.coneAngle ?? 54) * Math.PI / 180;
      this.light.penumbra = (data.coneFeather ?? 50) / 100;
      this.light.castShadow = data.castsShadows ?? false;
    } else if (this.light instanceof THREE.DirectionalLight) {
      this.light.intensity = intensity * 2;
      this.light.castShadow = data.castsShadows ?? false;
    } else if (this.light instanceof THREE.AmbientLight) {
      this.light.intensity = intensity * 2;
    }
  }

  private _updateGizmoProps(data: LightData): void {
    if (!this.gizmo) return;
    if (this.gizmo instanceof THREE.Mesh) {
      (this.gizmo.material as THREE.MeshBasicMaterial).color.set(data.color ?? '#ffffff');
    }
  }

  updateTransform3D(t3d: { position: { x: number; y: number; z: number }; rotationX?: number; rotationY?: number; rotationZ?: number }): void {
    this.group.position.set(t3d.position.x, t3d.position.y, -t3d.position.z);
    if (t3d.rotationX != null || t3d.rotationY != null || t3d.rotationZ != null) {
      this.group.rotation.set(
        THREE.MathUtils.degToRad(t3d.rotationX ?? 0),
        THREE.MathUtils.degToRad(t3d.rotationY ?? 0),
        THREE.MathUtils.degToRad(t3d.rotationZ ?? 0),
      );
    }
  }

  setVisible(visible: boolean): void { this.group.visible = visible; }

  dispose(): void {
    if (this.light) { this.group.remove(this.light); this.light.dispose(); }
    if (this.gizmo) {
      this.group.remove(this.gizmo);
      this.gizmo.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
  }

  // ── Gizmo creators ──

  private _createPointGizmo(data: LightData): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'light-gizmo';

    // Wireframe sphere showing light influence radius
    const radius = Math.min(data.falloffRadius ?? 100, 300);
    const sphereGeo = new THREE.SphereGeometry(radius, 16, 12);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Center diamond
    const diamondGeo = new THREE.OctahedronGeometry(8, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    group.add(new THREE.Mesh(diamondGeo, diamondMat));

    // Cross-hair lines
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.4,
      depthTest: false,
    });
    const lineLen = radius * 0.6;
    for (const axis of [
      [lineLen, 0, 0], [0, lineLen, 0], [0, 0, lineLen],
      [-lineLen, 0, 0], [0, -lineLen, 0], [0, 0, -lineLen],
    ] as [number, number, number][]) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...axis),
      ]);
      group.add(new THREE.LineSegments(geo, lineMat.clone()));
    }

    return group;
  }

  private _createSpotGizmo(data: LightData): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'light-gizmo';

    const angle = (data.coneAngle ?? 54) * Math.PI / 180;
    const dist = Math.min(data.falloffDistance ?? 300, 500);
    const coneRadius = Math.tan(angle) * dist;

    // Cone wireframe
    const coneGeo = new THREE.ConeGeometry(coneRadius, dist, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.z = -dist / 2;
    cone.rotation.x = Math.PI / 2; // point forward (-Z)
    group.add(cone);

    // Center diamond
    const diamondGeo = new THREE.OctahedronGeometry(8, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    group.add(new THREE.Mesh(diamondGeo, diamondMat));

    // Central ray line
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -dist),
    ]);
    const rayMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    });
    group.add(new THREE.LineSegments(rayGeo, rayMat));

    return group;
  }

  private _createDirGizmo(data: LightData): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'light-gizmo';

    // Direction arrows (4 parallel lines)
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    });
    const len = 120;
    const spread = 40;
    const offsets = [[-spread, -spread], [spread, -spread], [spread, spread], [-spread, spread]];
    for (const [ox, oy] of offsets) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ox, oy, 0),
        new THREE.Vector3(ox, oy, -len),
      ]);
      group.add(new THREE.LineSegments(geo, lineMat.clone()));
    }

    // Arrow heads at the end
    const arrowGeo = new THREE.ConeGeometry(6, 16, 6);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.6,
      depthTest: false,
    });
    for (const [ox, oy] of offsets) {
      const arrow = new THREE.Mesh(arrowGeo.clone(), arrowMat.clone());
      arrow.position.set(ox, oy, -len);
      arrow.rotation.x = Math.PI / 2;
      group.add(arrow);
    }

    // Center sun icon
    const sunGeo = new THREE.RingGeometry(10, 14, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    group.add(new THREE.Mesh(sunGeo, sunMat));

    return group;
  }

  private _createAmbientGizmo(data: LightData): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'light-gizmo';

    // Simple glowing sphere
    const sphereGeo = new THREE.SphereGeometry(20, 16, 12);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(sphereGeo, sphereMat));

    // "A" text indicator via small ring
    const ringGeo = new THREE.RingGeometry(22, 25, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color ?? '#ffffff'),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    group.add(new THREE.Mesh(ringGeo, ringMat));

    return group;
  }
}
