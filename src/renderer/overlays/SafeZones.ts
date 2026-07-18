/**
 * SafeZones — optional overlay showing action-safe and title-safe rectangles.
 * Rendered as line outlines inside the composition bounds.
 */
import * as THREE from 'three';
import { VIEWPORT_CONFIG } from '../../config/viewportConfig';

export class SafeZonesOverlay {
  public readonly group: THREE.Group;
  private actionSafe: THREE.LineSegments | null = null;
  private titleSafe: THREE.LineSegments | null = null;
  private _visible = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'safe-zones-overlay';
    this.group.visible = false;
  }

  /** Update safe zones when composition size changes */
  update(width: number, height: number): void {
    this.clear();
    this.group.visible = this._visible;

    const { ACTION_SAFE, TITLE_SAFE } = VIEWPORT_CONFIG.SAFE_ZONES;
    const asW = width * ACTION_SAFE;
    const asH = height * ACTION_SAFE;
    const tsW = width * TITLE_SAFE;
    const tsH = height * TITLE_SAFE;

    this.actionSafe = this.buildRect(-asW / 2, asW / 2, -asH / 2, asH / 2, new THREE.Color('#ffffff'), 1);
    this.titleSafe = this.buildRect(-tsW / 2, tsW / 2, -tsH / 2, tsH / 2, new THREE.Color('#cccccc'), 0.7);

    if (this.actionSafe) this.group.add(this.actionSafe);
    if (this.titleSafe) this.group.add(this.titleSafe);
  }

  show(): void { this._visible = true; this.group.visible = true; }
  hide(): void { this._visible = false; this.group.visible = false; }
  get visible(): boolean { return this._visible; }

  private buildRect(
    left: number, right: number, bottom: number, top: number,
    color: THREE.Color, opacity: number,
  ): THREE.LineSegments {
    const positions = [
      left, bottom, 0, right, bottom, 0,
      right, bottom, 0, right, top, 0,
      right, top, 0, left, top, 0,
      left, top, 0, left, bottom, 0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
    return new THREE.LineSegments(geo, mat);
  }

  private clear(): void {
    [this.actionSafe, this.titleSafe].forEach((obj) => {
      if (obj) {
        this.group.remove(obj);
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.actionSafe = null;
    this.titleSafe = null;
  }

  dispose(): void { this.clear(); }
}
