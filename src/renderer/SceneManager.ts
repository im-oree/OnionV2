/**
 * SceneManager — manages the Three.js Scene and all renderable content.
 * RENDER ORDER: compBounds (bg quad, dim outside) renders FIRST, then
 * grid, then layers, then safeZones on top. This ensures layers appear
 * inside the composition area and above the background.
 */
import * as THREE from 'three';
import { GridOverlay } from './overlays/Grid';
import { SafeZonesOverlay } from './overlays/SafeZones';
import { CompBoundsOverlay } from './overlays/CompBounds';
import { APP_BG_COLOR } from '../config/rendererColors';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly layerGroup: THREE.Group;
  public readonly grid: GridOverlay;
  public readonly safeZones: SafeZonesOverlay;
  public readonly compBounds: CompBoundsOverlay;

  public compWidth = 1920;
  public compHeight = 1080;

  private _ambientLight: THREE.AmbientLight | null = null;
  private _directionalLight: THREE.DirectionalLight | null = null;
  private _skybox: THREE.Mesh | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Create skybox — large inverted sphere with app background color
    this._createSkybox(APP_BG_COLOR);

    // Render order via renderOrder to ensure correct layering.
    // Since all materials use depthTest: false, THREE.js renders
    // objects in ascending renderOrder regardless of scene add order.
    // Order: compBounds darkOutside (-20) → bgQuad (-18) → border (-16)
    //        → grid (-5) → layers (0) → safeZones (5)
    // CRITICAL: layers MUST have higher renderOrder than grid so they
    // render ON TOP, preventing grid from showing through opaque meshes.
    this.compBounds = new CompBoundsOverlay();
    this.compBounds.group.renderOrder = -20;
    this.scene.add(this.compBounds.group);

    this.grid = new GridOverlay();
    this.grid.group.renderOrder = -5;
    this.scene.add(this.grid.group);

    // Layer group renders on top of grid
    this.layerGroup = new THREE.Group();
    this.layerGroup.name = 'layers';
    this.layerGroup.renderOrder = 0;
    this.scene.add(this.layerGroup);

    // Safe zones on top of everything
    this.safeZones = new SafeZonesOverlay();
    this.safeZones.group.renderOrder = 5;
    this.scene.add(this.safeZones.group);

    // Transparent — CSS layer underneath handles comp bg + app bg
    this.scene.background = null;
  }

  /** Create or update the skybox sphere */
  private _createSkybox(color: number): void {
    if (this._skybox) {
      this.scene.remove(this._skybox);
      this._skybox.geometry.dispose();
      (this._skybox.material as THREE.Material).dispose();
    }

    const geo = new THREE.SphereGeometry(10000, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this._skybox = new THREE.Mesh(geo, mat);
    this._skybox.renderOrder = -1000;
    this._skybox.name = 'skybox';
    this.scene.add(this._skybox);
  }

  /** Update skybox color when composition background changes */
  updateBackgroundColor(bgColor: string): void {
    const color = (bgColor === '#000000' || bgColor === 'transparent')
      ? new THREE.Color(APP_BG_COLOR)
      : new THREE.Color(bgColor);
    if (this._skybox) {
      (this._skybox.material as THREE.MeshBasicMaterial).color.copy(color);
    }
  }

  /** Toggle ground grid visibility */
  setGridVisible(visible: boolean): void {
    visible ? this.grid.show() : this.grid.hide();
  }

  get gridVisible(): boolean { return this.grid.visible; }

  applyComposition(width: number, height: number, bgColor: string, is3D?: boolean): void {
    this.compWidth = width;
    this.compHeight = height;
    this.grid.update(width, height, 1);
    this.compBounds.update(width, height, bgColor);
    this.safeZones.update(width, height);

    this.grid.set3DMode(is3D ?? false, width, height);

    if (is3D) {
      // Add a standard 3-point light setup if no lights exist
      if (!this._ambientLight) {
        this._ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this._ambientLight);
      }
      if (!this._directionalLight) {
        this._directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this._directionalLight.position.set(500, 500, 500);
        this._directionalLight.castShadow = true;
        this._directionalLight.shadow.mapSize.width = 2048;
        this._directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this._directionalLight);
      }
    }
  }

  updateGrid(zoom: number): void {
    this.grid.update(this.compWidth, this.compHeight, zoom);
  }

  addLayer(mesh: THREE.Mesh): void {
    this.layerGroup.add(mesh);
  }

  removeLayer(id: string): void {
    const child = this.layerGroup.getObjectByName(id);
    if (child instanceof THREE.Mesh) {
      this.layerGroup.remove(child);
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
    }
  }

  clearLayers(): void {
    for (let i = this.layerGroup.children.length - 1; i >= 0; i--) {
      const child = this.layerGroup.children[i];
      this.layerGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }
  }

  dispose(): void {
    if (this._skybox) {
      this.scene.remove(this._skybox);
      this._skybox.geometry.dispose();
      (this._skybox.material as THREE.Material).dispose();
      this._skybox = null;
    }
    this.grid.dispose();
    this.safeZones.dispose();
    this.compBounds.dispose();
    this.clearLayers();
  }
}
