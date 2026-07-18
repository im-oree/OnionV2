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

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly layerGroup: THREE.Group;
  public readonly grid: GridOverlay;
  public readonly safeZones: SafeZonesOverlay;
  public readonly compBounds: CompBoundsOverlay;

  private compWidth = 1920;
  private compHeight = 1080;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Render order via renderOrder to ensure correct layering.
    // Since all materials use depthTest: false, THREE.js renders
    // objects in ascending renderOrder regardless of scene add order.
    // Order: compBounds bgQuad (-20) → darkOutside (-15) → border (-10)
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

    // Solid background so CSS grid patterns don't show through transparent canvas
    this.scene.background = new THREE.Color('#1a1a1a');
  }

  applyComposition(width: number, height: number, bgColor: string): void {
    this.compWidth = width;
    this.compHeight = height;
    this.grid.update(width, height, 1);
    this.compBounds.update(width, height, bgColor);
    this.safeZones.update(width, height);
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
    this.grid.dispose();
    this.safeZones.dispose();
    this.compBounds.dispose();
    this.clearLayers();
  }
}
