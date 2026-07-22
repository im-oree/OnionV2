/**
 * SceneManager â€” manages the Three.js Scene and all renderable content.
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

    this._createSkybox(APP_BG_COLOR);

    this.compBounds = new CompBoundsOverlay();
    this.compBounds.group.renderOrder = -20;
    this.scene.add(this.compBounds.group);

    this.grid = new GridOverlay();
    this.grid.group.renderOrder = -5;
    this.scene.add(this.grid.group);

    this.layerGroup = new THREE.Group();
    this.layerGroup.name = 'layers';
    this.layerGroup.renderOrder = 0;
    this.scene.add(this.layerGroup);

    this.safeZones = new SafeZonesOverlay();
    this.safeZones.group.renderOrder = 5;
    this.scene.add(this.safeZones.group);

    this.scene.background = null;
  }

  private _createSkybox(color: number): void {
    if (this._skybox) {
      this.scene.remove(this._skybox);
      this._skybox.geometry.dispose();
      (this._skybox.material as THREE.Material).dispose();
    }
    const geo = new THREE.SphereGeometry(10000, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this._skybox = new THREE.Mesh(geo, mat);
    this._skybox.renderOrder = -1000;
    this._skybox.name = 'skybox';
    this.scene.add(this._skybox);
  }

  updateBackgroundColor(_bgColor: string): void {
    if (this._skybox) {
      (this._skybox.material as THREE.MeshBasicMaterial).color.set(APP_BG_COLOR);
    }
  }

  setGridVisible(visible: boolean): void {
    visible ? this.grid.show() : this.grid.hide();
  }

  get gridVisible(): boolean { return this.grid.visible; }

  /**
   * Apply composition. `is3D` should be TRUE when the composition is in
   * perspective mode OR when any 3D layer/camera/light exists â€” so the
   * grid switches to the horizontal ground plane instead of the vertical
   * wall grid.
   */
  applyComposition(width: number, height: number, bgColor: string, is3D?: boolean): void {
    this.compWidth = width;
    this.compHeight = height;
    this.grid.update(width, height, 1);
    this.compBounds.update(width, height, bgColor);
    this.safeZones.update(width, height);

    // Switch grid orientation to XZ ground plane whenever we're in a 3D scene
    this.grid.set3DMode(is3D ?? false, width, height);

    if (is3D) {
      // Auto-show grid in 3D so users always see the floor as spatial reference
      this.grid.show();

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

  addLayer(mesh: THREE.Mesh): void { this.layerGroup.add(mesh); }

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