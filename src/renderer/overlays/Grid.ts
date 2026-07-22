/**
 * GridOverlay â€” renders composition grid lines and optional 3D ground plane.
 * 2D grid: adaptive spacing, minor/major lines, center axes.
 * 3D mode: XZ ground plane with wireframe grid and RGB axes; 2D XY grid is hidden.
 */
import * as THREE from 'three';

export class GridOverlay {
  public readonly group: THREE.Group;
  private _2dGrid: THREE.Group;
  private _3dGround: THREE.Group;
  private _visible = false;
  private _3dModeActive = false;

  private _lastWidth = 0;
  private _lastHeight = 0;
  private _lastZoom = 0;
  private _last3DWidth = 0;
  private _last3DHeight = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'grid-overlay';
    this.group.renderOrder = -100;

    this._2dGrid = new THREE.Group();
    this._2dGrid.name = '2d-grid';
    this.group.add(this._2dGrid);

    this._3dGround = new THREE.Group();
    this._3dGround.name = '3d-ground-plane';
    this._3dGround.visible = false;
    this.group.add(this._3dGround);

    this.group.visible = false;
  }

  update(width: number, height: number, zoom: number): void {
    if (width <= 0 || height <= 0 || zoom <= 0) return;

    if (
      width === this._lastWidth &&
      height === this._lastHeight &&
      Math.abs(zoom - this._lastZoom) < 0.001
    ) {
      this.group.visible = this._visible;
      // Keep 2D grid hidden when 3D mode is on
      this._2dGrid.visible = !this._3dModeActive;
      return;
    }

    this._lastWidth = width;
    this._lastHeight = height;
    this._lastZoom = zoom;

    this._rebuild2DGrid(width, height, zoom);
    this._2dGrid.visible = !this._3dModeActive;
    this.group.visible = this._visible;
  }

  set3DMode(active: boolean, width = 1920, height = 1080): void {
    this._3dModeActive = active;
    this._2dGrid.visible = !active;
    this._3dGround.visible = active;

    if (
      active &&
      this._3dGround.children.length > 0 &&
      width === this._last3DWidth &&
      height === this._last3DHeight
    ) {
      return;
    }

    if (active) {
      this._disposeGroupChildren(this._3dGround);
      this.group.remove(this._3dGround);

      this._3dGround = this._create3DGroundPlane(width, height);
      this._3dGround.visible = true;
      this.group.add(this._3dGround);

      this._last3DWidth = width;
      this._last3DHeight = height;
    }
  }

  show(): void {
    this._visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this._visible = false;
    this.group.visible = false;
  }

  get visible(): boolean {
    return this._visible;
  }

  dispose(): void {
    this._disposeGroupChildren(this._2dGrid);
    this._disposeGroupChildren(this._3dGround);
  }

  private _disposeGroupChildren(g: THREE.Group): void {
    const toRemove: THREE.Object3D[] = [];
    g.traverse((child) => {
      if (
        child instanceof THREE.LineSegments ||
        child instanceof THREE.Mesh
      ) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) if (m instanceof THREE.Material) m.dispose();
        toRemove.push(child);
      }
    });
    for (const obj of toRemove) obj.parent?.remove(obj);
  }

  private _niceStep(rawStep: number): number {
    if (rawStep <= 0) return 50;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let nice: number;
    if (normalized < 1.5) nice = 1;
    else if (normalized < 3.5) nice = 2;
    else if (normalized < 7.5) nice = 5;
    else nice = 10;
    return Math.max(5, nice * magnitude);
  }

  private _rebuild2DGrid(width: number, height: number, zoom: number): void {
    this._disposeGroupChildren(this._2dGrid);

    const halfW = width / 2;
    const halfH = height / 2;

    const targetScreenPx = 30;
    const rawStep = targetScreenPx / Math.max(0.01, zoom);
    const step = this._niceStep(rawStep);
    const majorStep = step * 5;

    const snapX = (v: number) => Math.ceil(v / step) * step;
    const snapMajorX = (v: number) => Math.ceil(v / majorStep) * majorStep;

    const minorVerts: number[] = [];
    for (let x = snapX(-halfW); x <= halfW; x += step) {
      if (Math.abs(x % majorStep) < 0.01) continue;
      minorVerts.push(x, -halfH, 0, x, halfH, 0);
    }
    for (let y = snapX(-halfH); y <= halfH; y += step) {
      if (Math.abs(y % majorStep) < 0.01) continue;
      minorVerts.push(-halfW, y, 0, halfW, y, 0);
    }
    if (minorVerts.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(minorVerts, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x2a2e38, transparent: true, opacity: 0.35,
        depthTest: false, depthWrite: false,
      });
      const lines = new THREE.LineSegments(geo, mat);
      lines.renderOrder = -2;
      lines.frustumCulled = false;
      this._2dGrid.add(lines);
    }

    const majorVerts: number[] = [];
    for (let x = snapMajorX(-halfW); x <= halfW; x += majorStep) {
      if (Math.abs(x) < 0.01) continue;
      majorVerts.push(x, -halfH, 0, x, halfH, 0);
    }
    for (let y = snapMajorX(-halfH); y <= halfH; y += majorStep) {
      if (Math.abs(y) < 0.01) continue;
      majorVerts.push(-halfW, y, 0, halfW, y, 0);
    }
    if (majorVerts.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(majorVerts, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x3a3f4d, transparent: true, opacity: 0.5,
        depthTest: false, depthWrite: false,
      });
      const lines = new THREE.LineSegments(geo, mat);
      lines.renderOrder = -1;
      lines.frustumCulled = false;
      this._2dGrid.add(lines);
    }

    const axisVerts = new Float32Array([
      -halfW, 0, 0, halfW, 0, 0,
      0, -halfH, 0, 0, halfH, 0,
    ]);
    const axisColors = new Float32Array([
      0.85, 0.25, 0.25, 0.85, 0.25, 0.25,
      0.25, 0.8, 0.35, 0.25, 0.8, 0.35,
    ]);
    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute('position', new THREE.BufferAttribute(axisVerts, 3));
    axisGeo.setAttribute('color', new THREE.BufferAttribute(axisColors, 3));
    const axisMat = new THREE.LineBasicMaterial({
      vertexColors: true, depthTest: false, depthWrite: false,
      transparent: true, opacity: 0.5, linewidth: 1,
    });
    const axes = new THREE.LineSegments(axisGeo, axisMat);
    axes.renderOrder = 0;
    axes.frustumCulled = false;
    this._2dGrid.add(axes);
  }

  /**
   * Create a large XZ ground-plane grid centered at origin.
   * Extends well beyond composition bounds so it looks like a real floor.
   */
  private _create3DGroundPlane(width = 1920, height = 1080): THREE.Group {
    const g = new THREE.Group();
    g.name = '3d-ground-plane';

    // Make the plane much larger than the comp so panning/orbiting still shows floor.
    const extent = Math.max(width, height) * 6;
    const halfE = extent / 2;

    const shorter = Math.min(width, height);
    const rawSpacing = shorter / 20;
    const spacing = this._niceStep(rawSpacing);

    const minorLines: number[] = [];
    const majorLines: number[] = [];
    const majorStep = spacing * 10;

    for (let z = -halfE; z <= halfE + 0.001; z += spacing) {
      if (Math.abs(z) < 0.01) continue;
      const arr = (Math.abs(z % majorStep) < 0.01) ? majorLines : minorLines;
      arr.push(-halfE, 0, z, halfE, 0, z);
    }
    for (let x = -halfE; x <= halfE + 0.001; x += spacing) {
      if (Math.abs(x) < 0.01) continue;
      const arr = (Math.abs(x % majorStep) < 0.01) ? majorLines : minorLines;
      arr.push(x, 0, -halfE, x, 0, halfE);
    }

    if (minorLines.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(minorLines, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x555555, transparent: true, opacity: 0.18, depthWrite: false,
      });
      const seg = new THREE.LineSegments(geo, mat);
      seg.frustumCulled = false;
      seg.renderOrder = -12;
      g.add(seg);
    }
    if (majorLines.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(majorLines, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x7a7a7a, transparent: true, opacity: 0.32, depthWrite: false,
      });
      const seg = new THREE.LineSegments(geo, mat);
      seg.frustumCulled = false;
      seg.renderOrder = -11;
      g.add(seg);
    }

    // Red X axis + Blue Z axis (green Y is vertical / not drawn on ground)
    const axisVerts = new Float32Array([
      -halfE, 0, 0, halfE, 0, 0,   // X (red)
      0, 0, -halfE, 0, 0, halfE,   // Z (blue)
    ]);
    const axisColors = new Float32Array([
      0.9, 0.25, 0.25, 0.9, 0.25, 0.25,
      0.25, 0.5, 0.95, 0.25, 0.5, 0.95,
    ]);
    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute('position', new THREE.BufferAttribute(axisVerts, 3));
    axisGeo.setAttribute('color', new THREE.BufferAttribute(axisColors, 3));
    const axisMat = new THREE.LineBasicMaterial({
      vertexColors: true, depthWrite: false,
      transparent: true, opacity: 0.75,
    });
    const axes = new THREE.LineSegments(axisGeo, axisMat);
    axes.frustumCulled = false;
    axes.renderOrder = -10;
    g.add(axes);

    return g;
  }
}