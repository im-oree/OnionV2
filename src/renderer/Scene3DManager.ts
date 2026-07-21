import * as THREE from 'three';
import type { CameraData, LightData, Transform3D, MaterialProperties } from '../types/layer';

/**
 * Scene3DManager — manages the 3D environment with camera layers,
 * Z-sorting, lights, and shadows.
 *
 * API matches existing renderer calls:
 *   scene3D.updateCamera(cameraData, width, height)
 *   scene3D.syncLights(layers, scene)
 *   scene3D.perspectiveCamera (THREE.PerspectiveCamera)
 */
export class Scene3DManager {
  public perspectiveCamera: THREE.PerspectiveCamera;
  public activeCameraLayerId: string | null = null;
  public isActive = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private lights = new Map<string, THREE.Light>();
  private _aspect = 16 / 9;
  private _defaultLights: THREE.Light[] = [];

  constructor() {
    this.perspectiveCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 50000);
    this.perspectiveCamera.position.set(0, 0, 1000);
    this.perspectiveCamera.lookAt(0, 0, 0);
  }

  /** Set up default lighting so 3D objects are visible without adding lights. */
  setupDefaultLights(scene: THREE.Scene): void {
    if (this._defaultLights.length > 0) return; // already set up

    // Ambient — fills the scene so nothing is pure black
    const ambient = new THREE.AmbientLight(0x606060, 1.0);
    ambient.name = '__default_ambient';
    this._defaultLights.push(ambient);

    // Key light — directional from above-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(500, 800, 500);
    keyLight.name = '__default_key';
    this._defaultLights.push(keyLight);

    // Fill light — softer from opposite side
    const fillLight = new THREE.DirectionalLight(0x8888aa, 0.4);
    fillLight.position.set(-400, 300, -200);
    fillLight.name = '__default_fill';
    this._defaultLights.push(fillLight);

    for (const dl of this._defaultLights) scene.add(dl);
  }

  /** Set the renderer (needed for shadow maps). Call after construction. */
  setRenderer(r: THREE.WebGLRenderer): void {
    this.renderer = r;
  }

  /**
   * Update camera from a camera layer's data — called by Renderer.
   * This is the existing API the renderer calls.
   */
  updateCamera(data: CameraData, width: number, height: number): void {
    this.isActive = true;
    this._aspect = width / height;

    // Convert focal length to FOV (35mm full-frame sensor width = 36mm)
    const fov = 2 * Math.atan(36 / (2 * data.focalLength)) * (180 / Math.PI);
    this.perspectiveCamera.fov = fov;
    this.perspectiveCamera.aspect = this._aspect;
    this.perspectiveCamera.near = 0.1;
    this.perspectiveCamera.far = 50000;

    // Position from camera layer's transform3D will be set externally
    // (the renderer positions the camera group; we just set projection)

    // Point of interest
    const poi = data.pointOfInterest ?? { x: 0, y: 0, z: 0 };
    this.perspectiveCamera.lookAt(poi.x, poi.y, poi.z);
    this.perspectiveCamera.updateProjectionMatrix();

    // Depth of field data — stored for external post-processing
    this.applyDepthOfField(data);
  }

  /**
   * Sync lights from light layers — called by Renderer.
   * This is the existing API the renderer calls.
   */
  syncLights(layers: Array<{ id: string; type: string; visible?: boolean; lightData?: LightData; transform3D?: Transform3D }>, scene: THREE.Scene): void {
    // Hide default lights when user has added real lights
    const hasUserLights = layers.some(l => l.type === 'light' && l.visible !== false);
    for (const dl of this._defaultLights) {
      if (hasUserLights && dl.parent) dl.parent.remove(dl);
      else if (!hasUserLights && !dl.parent) scene.add(dl);
    }

    const activeIds = new Set(
      layers.filter(l => l.type === 'light' && l.visible !== false).map(l => l.id)
    );

    // Remove stale lights
    for (const [id, light] of this.lights) {
      if (!activeIds.has(id)) {
        scene.remove(light);
        this.lights.delete(id);
        if ((light as any).shadow?.map) {
          (light as any).shadow.map.dispose();
        }
      }
    }

    // Enable shadow map in renderer if any light casts shadows
    const anyShadow = layers.some(l => l.type === 'light' && l.lightData?.castsShadows);
    if (this.renderer) {
      this.renderer.shadowMap.enabled = anyShadow;
      if (anyShadow) {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    }

    // Add/update lights
    for (const layer of layers) {
      if (layer.type !== 'light' || layer.visible === false) continue;
      const ld = layer.lightData!;
      const t3d = layer.transform3D ?? {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 100, y: 100, z: 100 },
        rotationX: 0, rotationY: 0, rotationZ: 0,
        orientation: { x: 0, y: 0, z: 0 },
        anchorPoint: { x: 0, y: 0, z: 0 },
        opacity: 100,
      };

      let light = this.lights.get(layer.id);

      if (!light) {
        switch (ld.lightType) {
          case 'point':
            light = new THREE.PointLight(ld.color, ld.intensity / 100, ld.falloffDistance);
            light.castShadow = ld.castsShadows;
            if (light.castShadow) {
              (light as THREE.PointLight).shadow.mapSize.set(512, 512);
            }
            break;
          case 'spot':
            light = new THREE.SpotLight(ld.color, ld.intensity / 100, ld.falloffDistance);
            light.castShadow = ld.castsShadows;
            if (light.castShadow) {
              (light as THREE.SpotLight).shadow.mapSize.set(512, 512);
              (light as THREE.SpotLight).angle = (ld.coneAngle * Math.PI) / 180;
              (light as THREE.SpotLight).penumbra = ld.coneFeather / 100;
            }
            break;
          case 'ambient':
            light = new THREE.AmbientLight(ld.color, ld.intensity / 100);
            break;
          default: // 'parallel'
            light = new THREE.DirectionalLight(ld.color, ld.intensity / 100);
            light.castShadow = ld.castsShadows;
            if (light.castShadow) {
              (light as THREE.DirectionalLight).shadow.mapSize.set(1024, 1024);
            }
            break;
        }
        this.lights.set(layer.id, light);
        scene.add(light);
      }

      // Update common properties
      light.color.set(ld.color);
      light.intensity = ld.intensity / 100;
      light.position.set(t3d.position.x, t3d.position.y, t3d.position.z);

      // Spot/directional: look at point of interest
      if (light instanceof THREE.SpotLight || light instanceof THREE.DirectionalLight) {
        const poi = ld.pointOfInterest ?? { x: 0, y: 0, z: 0 };
        (light as THREE.SpotLight | THREE.DirectionalLight).target.position.set(
          poi.x, poi.y, poi.z
        );
        if (!light.target.parent) {
          light.add(light.target);
        }
      }
    }
  }

  /**
   * Sort layers for 3D rendering: 3D layers sorted by Z position (far to near),
   * then 2D layers on top.
   */
  sort3DLayers<T extends { is3D?: boolean; transform3D?: { position: { z: number } } }>(layers: T[]): T[] {
    const flat = layers.filter(l => !l.is3D);
    const d3 = layers.filter(l => l.is3D);
    d3.sort((a, b) => {
      const za = a.transform3D?.position?.z ?? 0;
      const zb = b.transform3D?.position?.z ?? 0;
      return zb - za; // far to near (painter's algorithm)
    });
    return [...d3, ...flat];
  }

  /**
   * Check if composition has 3D content.
   */
  has3DContent(comp: { layers: Array<{ is3D?: boolean; type?: string }> }): boolean {
    return comp.layers.some(l => l.is3D || l.type === 'camera' || l.type === 'light');
  }

  /**
   * Apply depth of field (stored for post-processing).
   */
  applyDepthOfField(data: CameraData): void {
    if (data.aperture > 0 && data.blurLevel > 0) {
      this.perspectiveCamera.setFocalLength(data.focalLength);
    }
  }

  /** Apply material properties to a Three.js material. */
  static applyMaterialProps(material: THREE.Material, props: MaterialProperties | undefined): void {
    if (!props) return;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.roughness = 1 - ((props.metal ?? 0) / 100);
      material.metalness = (props.metal ?? 0) / 100;
      material.emissiveIntensity = (props.ambient ?? 0) / 200;
      material.emissive.setHex(0xffffff);
    }
  }

  setAspect(width: number, height: number): void {
    this._aspect = width / height;
    if (this.isActive) {
      this.perspectiveCamera.aspect = this._aspect;
      this.perspectiveCamera.updateProjectionMatrix();
    }
  }

  dispose(): void {
    for (const [, light] of this.lights) {
      if (light.parent) light.parent.remove(light);
      light.dispose();
    }
    this.lights.clear();
  }
}
