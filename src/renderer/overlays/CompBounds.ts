import * as THREE from 'three';
import { getCSSColor } from '../../utils/theme';
import { APP_BG_COLOR } from '../../config/rendererColors';

export class CompBoundsOverlay {
  public readonly group: THREE.Group;
  private border: THREE.LineSegments | null = null;
  private glowLine: THREE.LineSegments | null = null;
  private darkOutside: THREE.Mesh | null = null;
  private bgQuad: THREE.Mesh | null = null;
  private _visible = true;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'comp-bounds-overlay';
    this.group.visible = false; // Disabled — CSS layer handles this now
  }

  update(width: number, height: number, bgColor: string): void {
    this.clear();

    const halfW = width / 2;
    const halfH = height / 2;
    const worldSize = Math.max(width, height) * 10;

    // Outside area — matches the app background (darker charcoal)
    const outsideColor = getCSSColor('--viewport-outside', `#${APP_BG_COLOR.toString(16).padStart(6, '0')}`);
    const outsideGeo = this._buildOutsideQuad(worldSize, halfW, halfH);
    const outsideMat = new THREE.MeshBasicMaterial({
      color: outsideColor,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.darkOutside = new THREE.Mesh(outsideGeo, outsideMat);
    this.darkOutside.renderOrder = -20;
    this.group.add(this.darkOutside);

    // Composition background — ALWAYS visible.
    // If user hasn't set a bg color (or it matches app bg), use a slightly
    // lighter fill so the comp area is always distinct from outside.
    let effectiveBg = bgColor;
    const isDefaultOrEmpty = !bgColor
      || bgColor.toLowerCase() === '#000000'
      || bgColor.toLowerCase() === '#000';
    if (isDefaultOrEmpty) {
      // Use viewport-bg (defined in theme.css) for that "canvas surface" look
      effectiveBg = getCSSColor('--viewport-bg', '#13151a');
    }

    const bgMat = new THREE.MeshBasicMaterial({
      color: effectiveBg,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const bgGeo = new THREE.PlaneGeometry(width, height);
    this.bgQuad = new THREE.Mesh(bgGeo, bgMat);
    this.bgQuad.renderOrder = -18;
    this.group.add(this.bgQuad);

    // Comp border — subtle indigo hairline, always visible
    const borderPos = [
      -halfW, -halfH, 0, halfW, -halfH, 0,
      halfW, -halfH, 0, halfW, halfH, 0,
      halfW, halfH, 0, -halfW, halfH, 0,
      -halfW, halfH, 0, -halfW, -halfH, 0,
    ];
    const borderGeo = new THREE.BufferGeometry();
    borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderPos, 3));
    const borderColor = getCSSColor('--color-accent', '#5865ff');
    const borderMat = new THREE.LineBasicMaterial({
      color: borderColor,
      depthTest: false,
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    });
    this.border = new THREE.LineSegments(borderGeo, borderMat);
    this.border.renderOrder = -16;
    this.group.add(this.border);

    // Soft outer shadow line (subtle depth)
    const glowOffset = 2;
    const glowPos = [
      -halfW - glowOffset, -halfH - glowOffset, 0, halfW + glowOffset, -halfH - glowOffset, 0,
      halfW + glowOffset, -halfH - glowOffset, 0, halfW + glowOffset, halfH + glowOffset, 0,
      halfW + glowOffset, halfH + glowOffset, 0, -halfW - glowOffset, halfH + glowOffset, 0,
      -halfW - glowOffset, halfH + glowOffset, 0, -halfW - glowOffset, -halfH - glowOffset, 0,
    ];
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
    const glowMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      depthTest: false,
      transparent: true,
      opacity: 0.4,
    });
    this.glowLine = new THREE.LineSegments(glowGeo, glowMat);
    this.glowLine.renderOrder = -19;
    this.group.add(this.glowLine);

    this.group.visible = false; // Disabled — CSS layer handles this now
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
    [this.border, this.glowLine, this.darkOutside, this.bgQuad].forEach(obj => {
      if (obj) {
        this.group.remove(obj);
        obj.geometry.dispose();
        const mat = (obj as any).material;
        if (mat instanceof THREE.Material) mat.dispose();
        else if (Array.isArray(mat)) mat.forEach((m: any) => m instanceof THREE.Material && m.dispose());
      }
    });
    this.border = null;
    this.glowLine = null;
    this.darkOutside = null;
    this.bgQuad = null;
  }

  dispose(): void { this.clear(); }
}