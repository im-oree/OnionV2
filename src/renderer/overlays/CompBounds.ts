import * as THREE from 'three';
import { getCSSColor } from '../../utils/theme';
import { APP_BG_COLOR } from '../../config/rendererColors';

export class CompBoundsOverlay {
  public readonly group: THREE.Group;
  private border: THREE.LineSegments | null = null;
  private glowLine: THREE.LineSegments | null = null;
  private darkOutside: THREE.Mesh | null = null;
  private bgQuad: THREE.Mesh | null = null;
  private _visible = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'comp-bounds-overlay';
    this.group.visible = false; // CSS layer (CompBoundsCSS) draws the comp box
  }

  update(width: number, height: number, bgColor: string): void {
    this.clear();

    const halfW = width / 2;
    const halfH = height / 2;
    const worldSize = Math.max(width, height) * 10;

    const outsideColor = getCSSColor(
      '--viewport-outside',
      `#${APP_BG_COLOR.toString(16).padStart(6, '0')}`,
    );
    const outsideGeo = this._buildOutsideQuad(worldSize, halfW, halfH);
    const outsideMat = new THREE.MeshBasicMaterial({
      color: outsideColor,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.darkOutside = new THREE.Mesh(outsideGeo, outsideMat);
    this.darkOutside.renderOrder = -20;
    this.group.add(this.darkOutside);

    // Comp bg quad â€” use EXACTLY the user's chosen color.
    const effectiveBg =
      (bgColor && bgColor.trim() !== '') ? bgColor : '#000000';

    const bgMat = new THREE.MeshBasicMaterial({
      color: effectiveBg,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const bgGeo = new THREE.PlaneGeometry(width, height);
    this.bgQuad = new THREE.Mesh(bgGeo, bgMat);
    this.bgQuad.renderOrder = -18;
    this.group.add(this.bgQuad);

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
      opacity: 0.9,
      linewidth: 2,
    });
    this.border = new THREE.LineSegments(borderGeo, borderMat);
    this.border.renderOrder = -16;
    this.group.add(this.border);

    const glowOffset = 3;
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
      opacity: 0.55,
    });
    this.glowLine = new THREE.LineSegments(glowGeo, glowMat);
    this.glowLine.renderOrder = -19;
    this.group.add(this.glowLine);

    // Kept hidden â€” CSS overlay handles this in 2D. WebGL only clears the
    // comp rect via scissor, so we don't want a second bg quad fighting it.
    this.group.visible = false;
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