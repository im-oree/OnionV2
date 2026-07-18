import * as THREE from 'three';
import { getCSSColor } from '../../utils/theme';

export class CompBoundsOverlay {
  public readonly group: THREE.Group;
  private border: THREE.LineSegments | null = null;
  private darkOutside: THREE.Mesh | null = null;
  private bgQuad: THREE.Mesh | null = null;
  private _visible = true;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'comp-bounds-overlay';
  }

  update(width: number, height: number, bgColor: string): void {
    this.clear();

    const halfW = width / 2;
    const halfH = height / 2;
    const worldSize = Math.max(width, height) * 10;

    // Outside area — medium grey (reads from CSS var, falls back to #3d3d3d)
    const outsideColor = getCSSColor('--viewport-outside', '#3d3d3d');
    const outsideGeo = this._buildOutsideQuad(worldSize, halfW, halfH);
    const outsideMat = new THREE.MeshBasicMaterial({
      color: outsideColor,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    // Set render order so outside is behind everything
    this.darkOutside = new THREE.Mesh(outsideGeo, outsideMat);
    this.darkOutside.renderOrder = -20;
    this.group.add(this.darkOutside);

    // Comp background quad (inside area)
    const bgMat = new THREE.MeshBasicMaterial({
      color: bgColor,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const bgGeo = new THREE.PlaneGeometry(width, height);
    this.bgQuad = new THREE.Mesh(bgGeo, bgMat);
    this.bgQuad.renderOrder = -18;
    this.group.add(this.bgQuad);

    // Border line (subtle accent)
    const borderPos = [
      -halfW, -halfH, 0, halfW, -halfH, 0,
      halfW, -halfH, 0, halfW, halfH, 0,
      halfW, halfH, 0, -halfW, halfH, 0,
      -halfW, halfH, 0, -halfW, -halfH, 0,
    ];
    const borderGeo = new THREE.BufferGeometry();
    borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderPos, 3));
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x4772b3,
      depthTest: false,
      transparent: true,
      opacity: 0.4,
    });
    this.border = new THREE.LineSegments(borderGeo, borderMat);
    this.border.renderOrder = -16;
    this.group.add(this.border);

    this.group.visible = this._visible;
  }

  show(): void { this._visible = true; this.group.visible = true; }
  hide(): void { this._visible = false; this.group.visible = false; }
  get visible(): boolean { return this._visible; }

  private _buildOutsideQuad(worldSize: number, halfW: number, halfH: number): THREE.BufferGeometry {
    const s = worldSize;
    const positions: number[] = [
      -s, halfH, 0, s, halfH, 0, s, s, 0, -s, halfH, 0, s, s, 0, -s, s, 0,
      -s, -s, 0, s, -s, 0, s, -halfH, 0, -s, -s, 0, s, -halfH, 0, -s, -halfH, 0,
      -s, -halfH, 0, -halfW, -halfH, 0, -halfW, halfH, 0, -s, -halfH, 0, -halfW, halfH, 0, -s, halfH, 0,
      halfW, -halfH, 0, s, -halfH, 0, s, halfH, 0, halfW, -halfH, 0, s, halfH, 0, halfW, halfH, 0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }

  private clear(): void {
    [this.border, this.darkOutside, this.bgQuad].forEach(obj => {
      if (obj) {
        this.group.remove(obj);
        obj.geometry.dispose();
        if (obj instanceof THREE.Mesh) (obj.material as THREE.Material).dispose();
      }
    });
    this.border = null;
    this.darkOutside = null;
    this.bgQuad = null;
  }

  dispose(): void { this.clear(); }
}
