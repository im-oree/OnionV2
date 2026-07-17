import * as THREE from 'three';
import type { Composition } from '../types/composition';

interface GridConfig {
  enabled: boolean;
  majorLines: number;
  minorLines: number;
  majorColor: string;
  minorColor: string;
}

const DEFAULT_GRID: GridConfig = {
  enabled: true,
  majorLines: 8,
  minorLines: 4,
  majorColor: '#3d3d3d',
  minorColor: '#2b2b2b',
};

export class SceneManager {
  public readonly scene: THREE.Scene;
  private gridHelper: THREE.GridHelper | null = null;
  private gridConfig: GridConfig = { ...DEFAULT_GRID };
  private compositionSize = { width: 1920, height: 1080 };

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a1a');
  }

  setCompositionSize(width: number, height: number): void {
    this.compositionSize = { width, height };
    this.updateGrid();
  }

  applyComposition(comp: Composition): void {
    this.scene.background = new THREE.Color(comp.backgroundColor);
    this.compositionSize = { width: comp.width, height: comp.height };
    this.updateGrid();
  }

  setGridEnabled(enabled: boolean): void {
    this.gridConfig.enabled = enabled;
    this.updateGrid();
  }

  private updateGrid(): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
    }

    if (!this.gridConfig.enabled) return;

    const { width, height } = this.compositionSize;
    const gridSize = Math.max(width, height);
    const divisions = this.gridConfig.majorLines;

    this.gridHelper = new THREE.GridHelper(
      gridSize, divisions,
      this.gridConfig.majorColor,
      this.gridConfig.minorColor,
    );
    this.gridHelper.position.set(0, 0, 0);
    this.scene.add(this.gridHelper);
  }

  dispose(): void {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    if (this.gridHelper) {
      this.gridHelper.dispose();
    }
  }
}
