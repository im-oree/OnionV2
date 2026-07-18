/**
 * Grid — custom Three.js line-based grid overlay, bounded by composition area.
 * Two levels: minor (thin) and major (thicker).
 * Red X axis, green Y axis (Blender-style).
 * Lines only render INSIDE composition bounds (A4 fix).
 */
import * as THREE from 'three';

export class GridOverlay {
  public readonly group: THREE.Group;
  private minorLines: THREE.LineSegments | null = null;
  private majorLines: THREE.LineSegments | null = null;
  private axes: THREE.LineSegments | null = null;
  private _visible = true;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'grid-overlay';
  }

  /** Rebuild grid at given composition size and zoom */
  update(width: number, height: number, zoom: number): void {
    this.clear();

    const halfW = Math.round(width / 2);
    const halfH = Math.round(height / 2);

    // Adaptive step based on zoom
    // zoom=1 means comp fits viewport. Smaller zoom = more zoomed in = finer grid.
    const rawStep = 10 * zoom;
    const step = rawStep < 5 ? 5 : rawStep < 10 ? 10 : rawStep < 25 ? 25 : rawStep < 50 ? 50 : rawStep < 100 ? 100 : 500;
    const majorStep = step * 10;

    const maxLines = 300;

    // Minor grid lines — bounded by comp
    this.minorLines = this.buildGridLines(
      -halfW, halfW, -halfH, halfH,
      step,
      new THREE.Color(0x444444), 0.35, maxLines,
    );
    if (this.minorLines) { this.minorLines.renderOrder = -1; this.group.add(this.minorLines); }

    // Major grid lines
    this.majorLines = this.buildGridLines(
      -halfW, halfW, -halfH, halfH,
      majorStep,
      new THREE.Color(0x666666), 0.7, maxLines,
    );
    if (this.majorLines) { this.majorLines.renderOrder = 0; this.group.add(this.majorLines); }

    // Axes (red X right, green Y up) — only to comp edge
    this.axes = this.buildAxes(halfW, halfH);
    if (this.axes) { this.axes.renderOrder = 1; this.group.add(this.axes); }

    this.group.visible = this._visible;
  }

  private buildGridLines(
    left: number, right: number, bottom: number, top: number,
    step: number,
    color: THREE.Color, opacity: number,
    maxLines: number,
  ): THREE.LineSegments | null {
    const positions: number[] = [];
    let count = 0;

    // Vertical lines
    for (let x = left; x <= right && count < maxLines; x += step) {
      positions.push(x, bottom, 0, x, top, 0);
      count++;
    }
    // Horizontal lines
    for (let y = bottom; y <= top && count < maxLines; y += step) {
      positions.push(left, y, 0, right, y, 0);
      count++;
    }

    if (positions.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
    return new THREE.LineSegments(geo, mat);
  }

  private buildAxes(halfW: number, halfH: number): THREE.LineSegments {
    const positions = [
      // X axis (red): from center to right edge
      0, 0, 0, halfW, 0, 0,
      // Y axis (green): from center to top edge
      0, 0, 0, 0, halfH, 0,
    ];
    const colors = [
      1, 0, 0, 1, 0, 0,
      0, 1, 0, 0, 1, 0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false });
    return new THREE.LineSegments(geo, mat);
  }

  show(): void { this._visible = true; this.group.visible = true; }
  hide(): void { this._visible = false; this.group.visible = false; }
  get visible(): boolean { return this._visible; }

  private clear(): void {
    [this.minorLines, this.majorLines, this.axes].forEach((obj) => {
      if (obj) {
        this.group.remove(obj);
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.minorLines = null;
    this.majorLines = null;
    this.axes = null;
  }

  dispose(): void { this.clear(); }
}
