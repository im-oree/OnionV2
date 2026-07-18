/**
 * CompBounds — displays the composition boundary as a visible rectangle.
 * Everything outside is dimmed with a dark overlay quad.
 * Inside is the composition background color.
 */
import * as THREE from 'three';

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

  /** Update composition bounds for given dimensions and background color */
  update(width: number, height: number, bgColor: string): void {
    this.clear();

    const halfW = width / 2;
    const halfH = height / 2;
    const worldSize = Math.max(width, height) * 10; // large enough to cover viewport

    // Dark overlay outside composition
    const outsideGeo = this.buildOutsideQuad(worldSize, halfW, halfH);
    const outsideMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.darkOutside = new THREE.Mesh(outsideGeo, outsideMat);
    this.group.add(this.darkOutside);

    // Composition background quad (fills inside)
    const bgMat = new THREE.MeshBasicMaterial({
      color: bgColor,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const bgGeo = new THREE.PlaneGeometry(width, height);
    this.bgQuad = new THREE.Mesh(bgGeo, bgMat);
    this.group.add(this.bgQuad);

    // Border line
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
      opacity: 0.5,
    });
    this.border = new THREE.LineSegments(borderGeo, borderMat);
    this.group.add(this.border);

    this.group.visible = this._visible;
  }

  show(): void { this._visible = true; this.group.visible = true; }
  hide(): void { this._visible = false; this.group.visible = false; }
  get visible(): boolean { return this._visible; }

  private buildOutsideQuad(worldSize: number, halfW: number, halfH: number): THREE.BufferGeometry {
    // Create a large quad with a hole in the middle using 4 separate quads
    const s = worldSize;
    const positions: number[] = [
      // Top strip
      -s, halfH, 0, s, halfH, 0, s, s, 0, -s, halfH, 0, s, s, 0, -s, s, 0,
      // Bottom strip
      -s, -s, 0, s, -s, 0, s, -halfH, 0, -s, -s, 0, s, -halfH, 0, -s, -halfH, 0,
      // Left strip
      -s, -halfH, 0, -halfW, -halfH, 0, -halfW, halfH, 0, -s, -halfH, 0, -halfW, halfH, 0, -s, halfH, 0,
      // Right strip
      halfW, -halfH, 0, s, -halfH, 0, s, halfH, 0, halfW, -halfH, 0, s, halfH, 0, halfW, halfH, 0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }

  private clear(): void {
    [this.border, this.darkOutside, this.bgQuad].forEach((obj) => {
      if (obj) {
        this.group.remove(obj);
        obj.geometry.dispose();
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
    this.border = null;
    this.darkOutside = null;
    this.bgQuad = null;
  }

  dispose(): void { this.clear(); }
}
