/**
 * Grid — renders composition grid lines and optional 3D ground plane.
 * When 3D is active, also renders a ground plane wireframe at Z=0 with
 * X (red), Y (green), Z (blue) axes and a semi-transparent fill.
 */
import * as THREE from 'three';

export class GridOverlay {
  public readonly group: THREE.Group;
  private _2dGrid: THREE.Group;
  private _3dGround: THREE.Group;
  private _visible = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'grid-overlay';

    this._2dGrid = this._create2DGrid();
    this.group.add(this._2dGrid);

    this._3dGround = this._create3DGroundPlane();
    this._3dGround.visible = false;
    this.group.add(this._3dGround);

    this.group.visible = false;
  }

  update(width: number, height: number, zoom: number): void {
    // Rebuild 2D grid lines based on composition dimensions
    this._rebuild2DGrid(width, height, zoom);
    this.group.visible = this._visible;
  }

  /** Show 3D ground plane when scene has 3D layers */
  set3DMode(active: boolean, width = 1920, height = 1080): void {
    this._3dGround.visible = active;
    if (active) {
      // Rebuild ground plane to match comp size
      this.group.remove(this._3dGround);
      this._3dGround = this._create3DGroundPlane(width, height);
      this._3dGround.visible = true;
      this.group.add(this._3dGround);
    }
  }

  show(): void { this._visible = true; this.group.visible = true; }
  hide(): void { this._visible = false; this.group.visible = false; }
  get visible(): boolean { return this._visible; }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    this._disposeGroupChildren(this._2dGrid);
    this._disposeGroupChildren(this._3dGround);
  }

  private _disposeGroupChildren(g: THREE.Group): void {
    g.traverse((child) => {
      if (child instanceof THREE.LineSegments || child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          (child.material as THREE.Material).dispose();
        }
      }
    });
  }

  private _rebuild2DGrid(width: number, height: number, zoom: number): void {
    // Clear old 2D grid
    this._disposeGroupChildren(this._2dGrid);
    while (this._2dGrid.children.length > 0) {
      const child = this._2dGrid.children[0];
      this._2dGrid.remove(child);
    }

    const halfW = Math.round(width / 2);
    const halfH = Math.round(height / 2);

    const rawStep = 10 * zoom;
    const step = rawStep < 5 ? 5 : rawStep < 10 ? 10 : rawStep < 25 ? 25 : rawStep < 50 ? 50 : rawStep < 100 ? 100 : 500;
    const majorStep = step * 10;
    const maxLines = 300;

    // Minor grid lines
    const minorPositions: number[] = [];
    let count = 0;
    for (let x = -halfW; x <= halfW && count < maxLines; x += step) {
      minorPositions.push(x, -halfH, 0, x, halfH, 0);
      count++;
    }
    for (let y = -halfH; y <= halfH && count < maxLines; y += step) {
      minorPositions.push(-halfW, y, 0, halfW, y, 0);
      count++;
    }
    if (minorPositions.length > 0) {
      const minorGeo = new THREE.BufferGeometry();
      minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorPositions, 3));
      const minorMat = new THREE.LineBasicMaterial({ color: 0x2a2e38, transparent: true, opacity: 0.5, depthTest: false });
      const minorLines = new THREE.LineSegments(minorGeo, minorMat);
      minorLines.renderOrder = -1;
      this._2dGrid.add(minorLines);
    }

    // Major grid lines
    const majorPositions: number[] = [];
    count = 0;
    for (let x = -halfW; x <= halfW && count < maxLines; x += majorStep) {
      majorPositions.push(x, -halfH, 0, x, halfH, 0);
      count++;
    }
    for (let y = -halfH; y <= halfH && count < maxLines; y += majorStep) {
      majorPositions.push(-halfW, y, 0, halfW, y, 0);
      count++;
    }
    if (majorPositions.length > 0) {
      const majorGeo = new THREE.BufferGeometry();
      majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorPositions, 3));
      const majorMat = new THREE.LineBasicMaterial({ color: 0x3a3f4d, transparent: true, opacity: 0.7, depthTest: false });
      const majorLines = new THREE.LineSegments(majorGeo, majorMat);
      majorLines.renderOrder = 0;
      this._2dGrid.add(majorLines);
    }

    // Axes at center
    const axisPositions = [0, 0, 0, halfW, 0, 0, 0, 0, 0, 0, halfH, 0];
    const axisColors = [1, 0.35, 0.35, 1, 0.35, 0.35, 0.35, 1, 0.5, 0.35, 1, 0.5];
    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute('position', new THREE.Float32BufferAttribute(axisPositions, 3));
    axisGeo.setAttribute('color', new THREE.Float32BufferAttribute(axisColors, 3));
    const axisMat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.6 });
    const axes = new THREE.LineSegments(axisGeo, axisMat);
    axes.renderOrder = 1;
    this._2dGrid.add(axes);
  }

  private _create2DGrid(): THREE.Group {
    const g = new THREE.Group();
    g.name = '2d-grid';
    return g;
  }

  private _create3DGroundPlane(width = 1920, height = 1080): THREE.Group {
    const g = new THREE.Group();
    g.name = '3d-ground-plane';

    const halfW = width / 2;
    const halfH = height / 2;
    const spacing = 100;

    // ── Grid lines on XZ plane (horizontal floor at Y=0) ──
    const lines: number[] = [];
    // Lines along X (into depth)
    for (let z = -halfH; z <= halfH; z += spacing) {
      lines.push(-halfW, 0, z, halfW, 0, z);
    }
    // Lines along Z (across)
    for (let x = -halfW; x <= halfW; x += spacing) {
      lines.push(x, 0, -halfH, x, 0, halfH);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x555555, transparent: true, opacity: 0.15, depthWrite: false,
    });
    g.add(new THREE.LineSegments(geo, mat));

    // ── Origin axes: X=right(red), Y=up(green), Z=depth(blue) ──
    const axisLen = Math.min(halfW, halfH) * 0.5;
    const axisPositions: number[] = [];
    const axisColors: number[] = [];
    // X axis (red) → right
    axisPositions.push(0, 0, 0, axisLen, 0, 0);
    axisColors.push(1, 0.2, 0.2, 1, 0.2, 0.2);
    // Y axis (green) → up
    axisPositions.push(0, 0, 0, 0, axisLen, 0);
    axisColors.push(0.2, 1, 0.3, 0.2, 1, 0.3);
    // Z axis (blue) → into depth
    axisPositions.push(0, 0, 0, 0, 0, axisLen);
    axisColors.push(0.2, 0.5, 1, 0.2, 0.5, 1);

    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute('position', new THREE.Float32BufferAttribute(axisPositions, 3));
    axisGeo.setAttribute('color', new THREE.Float32BufferAttribute(axisColors, 3));
    const axisMat = new THREE.LineBasicMaterial({ vertexColors: true, depthWrite: false, transparent: true, opacity: 0.7 });
    g.add(new THREE.LineSegments(axisGeo, axisMat));

    // ── Ground fill plane (horizontal at Y=0) ──
    const planeGeo = new THREE.PlaneGeometry(width, height);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x222222, transparent: true, opacity: 0.03,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2; // Lay flat on XZ plane
    plane.renderOrder = -10;
    g.add(plane);

    return g;
  }
}
