/**
 * Grid — line-based grid overlay bounded by composition area.
 */
import * as THREE from 'three';
import { getCSSColor } from '../../utils/theme';

function parseHexToNum(hex: string, fallback: number): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  return parseInt(m[1], 16);
}

export class GridOverlay {
  public readonly group: THREE.Group;
  private minorLines: THREE.LineSegments | null = null;
  private majorLines: THREE.LineSegments | null = null;
  private axes: THREE.LineSegments | null = null;
  private _visible = false;                       // ← default hidden

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'grid-overlay';
    this.group.visible = false;
  }

  update(width: number, height: number, zoom: number): void {
    this.clear();

    const halfW = Math.round(width / 2);
    const halfH = Math.round(height / 2);

    const rawStep = 10 * zoom;
    const step = rawStep < 5 ? 5 : rawStep < 10 ? 10 : rawStep < 25 ? 25 : rawStep < 50 ? 50 : rawStep < 100 ? 100 : 500;
    const majorStep = step * 10;
    const maxLines = 300;

    // Use theme colors (subtle)
    const minorHex = parseHexToNum(getCSSColor('--viewport-grid', '#2a2e38').replace('rgba', '').replace('rgb', '').replace(/[(),\s\d.]/g, '') || '#2a2e38', 0x2a2e38);
    // Simpler: hardcode based on theme intent
    const minorColor = new THREE.Color(0x2a2e38);
    const majorColor = new THREE.Color(0x3a3f4d);

    this.minorLines = this.buildGridLines(-halfW, halfW, -halfH, halfH, step, minorColor, 0.5, maxLines);
    if (this.minorLines) { this.minorLines.renderOrder = -1; this.group.add(this.minorLines); }

    this.majorLines = this.buildGridLines(-halfW, halfW, -halfH, halfH, majorStep, majorColor, 0.7, maxLines);
    if (this.majorLines) { this.majorLines.renderOrder = 0; this.group.add(this.majorLines); }

    this.axes = this.buildAxes(halfW, halfH);
    if (this.axes) { this.axes.renderOrder = 1; this.group.add(this.axes); }

    this.group.visible = this._visible;
    void minorHex;
  }

  private buildGridLines(
    left: number, right: number, bottom: number, top: number,
    step: number, color: THREE.Color, opacity: number, maxLines: number,
  ): THREE.LineSegments | null {
    const positions: number[] = [];
    let count = 0;
    for (let x = left; x <= right && count < maxLines; x += step) {
      positions.push(x, bottom, 0, x, top, 0);
      count++;
    }
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
    const positions = [0, 0, 0, halfW, 0, 0, 0, 0, 0, 0, halfH, 0];
    const colors = [1, 0.35, 0.35, 1, 0.35, 0.35, 0.35, 1, 0.5, 0.35, 1, 0.5];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.6 });
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