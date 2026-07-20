/**
 * SelectionOverlay — draws selection outline + PowerPoint-style bounding box handles + Blender gizmo.
 *
 * LAYER STACK (bottom to top):
 * 1. Selection polygon (rotated rectangle outline) — always shown
 * 2. Bounding box handles (8 corner/edge + rotation) — always shown when selected (hidden during modal)
 * 3. Blender gizmo (colored arrows/rings) — shown only when Move/Rotate/Scale tool active
 * 4. Anchor crosshair — always shown
 *
 * L1-L6: Handles use data-handle and data-layer-id attributes for interaction in useViewportInput.
 * Bounding box handles are white squares with subtle border (PowerPoint/Avnac style).
 */
import * as THREE from 'three';
import type { CameraManager } from '../CameraManager';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';

export type GizmoMode = 'move' | 'rotate' | 'scale' | null;

const NS = 'http://www.w3.org/2000/svg';

interface ScreenCorner { x: number; y: number; }

/** Corner/edge handle positions relative to bounding box */
type HandlePos = 'tl' | 'tr' | 'br' | 'bl' | 'top' | 'right' | 'bottom' | 'left';

export class SelectionOverlay {
  private container: HTMLElement;
  private cameraManager: CameraManager;
  private svg: SVGSVGElement | null = null;
  private _visible = false;
  private _gizmoMode: GizmoMode = null;
  /** L4: Hide bounding box handles during modal transform */
  private _hideHandles = false;
  /** Last-selected layer ID for brighter outline when multi-selecting */
  private _lastSelectedId: string | null = null;

  constructor(container: HTMLElement, cameraManager: CameraManager) {
    this.container = container;
    this.cameraManager = cameraManager;
  }

  set gizmoMode(mode: GizmoMode) { this._gizmoMode = mode; }
  get gizmoMode(): GizmoMode { return this._gizmoMode; }

  /** L4: Toggle handle visibility (hidden during modal transform) */
  set hideHandles(v: boolean) { this._hideHandles = v; }
  get hideHandles(): boolean { return this._hideHandles; }

  /** Set the last-selected layer ID for brighter outline in multi-select */
  set lastSelectedId(id: string | null) { this._lastSelectedId = id; }
  get lastSelectedId(): string | null { return this._lastSelectedId; }

  mount(): void {
    if (this.svg) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '25';
    svg.style.width = '100%';
    svg.style.height = '100%';
    this.container.appendChild(svg);
    this.svg = svg;
  }

  unmount(): void {
    if (this.svg && this.svg.parentElement) this.svg.parentElement.removeChild(this.svg);
    this.svg = null;
  }

  update(renderers: BaseLayerRenderer[]): void {
    if (!this.svg) return;
    this.svg.innerHTML = '';
    if (renderers.length === 0 || !this._visible) return;

    const accent = 'var(--color-accent)';
    const white = '#ffffff';
    const handleSize = 8; // corner handle size
    const edgeSize = 6;  // edge handle size

    let allCorners: ScreenCorner[] = [];
    let worldCenterX = 0, worldCenterY = 0, centerCount = 0;

    for (const r of renderers) {
      const corners = this._getWorldCorners(r);
      if (corners.length < 4) continue;

      // N2: Selection polygon — double outline for visibility on any background
      // Last-selected gets brighter/thicker outline when multi-selecting
      const isLastSelected = renderers.length > 1 && this._lastSelectedId && r.id === this._lastSelectedId;
      const isMulti = renderers.length > 1;
      const pts = corners.map((c) => `${c.x},${c.y}`).join(' ');
      // Black shadow outline underneath
      const shadow = document.createElementNS(NS, 'polygon');
      shadow.setAttribute('points', pts);
      shadow.setAttribute('fill', 'none');
      shadow.setAttribute('stroke', '#000000');
      shadow.setAttribute('stroke-width', isLastSelected ? '4' : '3');
      this.svg.appendChild(shadow);
      // Main outline on top — brighter and thicker for last-selected
      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', 'none');
      if (isLastSelected) {
        // Last-selected: bright white accent
        poly.setAttribute('stroke', '#ffffff');
        poly.setAttribute('stroke-width', '2.5');
      } else if (isMulti) {
        // Other selected: dimmer accent
        poly.setAttribute('stroke', 'rgba(71,114,179,0.8)');
        poly.setAttribute('stroke-width', '1.5');
      } else {
        // Single selection: accent color
        poly.setAttribute('stroke', accent);
        poly.setAttribute('stroke-width', '1.5');
      }
      this.svg.appendChild(poly);

      allCorners = allCorners.concat(corners);

      // World center for gizmo + anchor
      const worldPos = new THREE.Vector3();
      r.group.getWorldPosition(worldPos);
      worldCenterX += worldPos.x;
      worldCenterY += worldPos.y;
      centerCount++;

      // ── 2. Bounding box handles (unless hidden) ──
      if (!this._hideHandles) {
        this._drawBoundingBoxHandles(corners, r.mesh, handleSize, edgeSize, white, accent);
      }

      // ── 5. Anchor crosshair ──
      this._drawAnchor(worldPos.x, worldPos.y);
    }

    if (allCorners.length === 0) return;

    // Compute union bounding box of all screen corners
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of allCorners) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
    if (!isFinite(minX)) return;

    const gizmoCx = worldCenterX / centerCount;
    const gizmoCy = worldCenterY / centerCount;
    const gizmoScreen = this.cameraManager.worldToScreen(gizmoCx, gizmoCy);
    const gx = gizmoScreen.x, gy = gizmoScreen.y;

    // ── 3. Blender gizmo (L5: only when Move/Rotate/Scale tool active) ──
    switch (this._gizmoMode) {
      case 'move':    this._drawMoveGizmo(gx, gy, accent, white); break;
      case 'rotate':  this._drawRotateGizmo(gx, gy, accent, white); break;
      case 'scale':   this._drawScaleGizmo(gx, gy, accent, white); break;
    }
  }

  // ── L2: PowerPoint-style bounding box handles ─────────────
  private _drawBoundingBoxHandles(
    corners: ScreenCorner[], _mesh: THREE.Mesh,
    handleSize: number, edgeSize: number,
    white: string, accent: string,
  ): void {
    // Corners: TL, TR, BR, BL
    const handlePositions: { pos: HandlePos; cx: number; cy: number }[] = [
      { pos: 'tl', cx: corners[0].x, cy: corners[0].y },
      { pos: 'tr', cx: corners[1].x, cy: corners[1].y },
      { pos: 'br', cx: corners[2].x, cy: corners[2].y },
      { pos: 'bl', cx: corners[3].x, cy: corners[3].y },
    ];

    // Edges: midpoint between each pair of corners
    const edgePositions: { pos: HandlePos; cx: number; cy: number }[] = [
      { pos: 'top',    cx: (corners[0].x + corners[1].x) / 2, cy: (corners[0].y + corners[1].y) / 2 },
      { pos: 'right',  cx: (corners[1].x + corners[2].x) / 2, cy: (corners[1].y + corners[2].y) / 2 },
      { pos: 'bottom', cx: (corners[2].x + corners[3].x) / 2, cy: (corners[2].y + corners[3].y) / 2 },
      { pos: 'left',   cx: (corners[3].x + corners[0].x) / 2, cy: (corners[3].y + corners[0].y) / 2 },
    ];

    // Corner handles (10x10 white squares)
    for (const h of handlePositions) {
      const hEl = this._rect(
        h.cx - handleSize / 2, h.cy - handleSize / 2,
        handleSize, handleSize, accent, 1, white,
      );
      hEl.setAttribute('data-handle', h.pos);
      hEl.style.pointerEvents = 'all';
      hEl.style.cursor = this._cursorForHandle(h.pos, 0);
      hEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
      this.svg!.appendChild(hEl);
    }

    // Edge handles (8x8 white squares)
    for (const h of edgePositions) {
      const eEl = this._rect(
        h.cx - edgeSize / 2, h.cy - edgeSize / 2,
        edgeSize, edgeSize, accent, 1, white,
      );
      eEl.setAttribute('data-handle', h.pos);
      eEl.style.pointerEvents = 'all';
      eEl.style.cursor = this._cursorForHandle(h.pos, 0);
      eEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
      this.svg!.appendChild(eEl);
    }

    // Rotation handle: a circle above the top edge, connected by a thin line
    const topCenterX = (corners[0].x + corners[1].x) / 2;
    const topCenterY = (corners[0].y + corners[1].y) / 2;
    // Direction from TL to TR gives us the "top edge" normal
    const edgeDx = corners[1].x - corners[0].x;
    const edgeDy = corners[1].y - corners[0].y;
    const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;
    // Normal pointing outward (perpendicular to top edge, pointing away from center)
    const nx = -edgeDy / edgeLen;
    const ny = edgeDx / edgeLen;
    const offset = 24; // pixels above the top edge
    const rotX = topCenterX + nx * offset;
    const rotY = topCenterY + ny * offset;

    // Connector line
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', String(topCenterX));
    line.setAttribute('y1', String(topCenterY));
    line.setAttribute('x2', String(rotX));
    line.setAttribute('y2', String(rotY));
    line.setAttribute('stroke', accent);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '3 2');
    line.style.pointerEvents = 'none';
    this.svg!.appendChild(line);

    // Rotation handle circle (12x12)
    const rotHandle = document.createElementNS(NS, 'circle');
    rotHandle.setAttribute('cx', String(rotX));
    rotHandle.setAttribute('cy', String(rotY));
    rotHandle.setAttribute('r', '6');
    rotHandle.setAttribute('fill', white);
    rotHandle.setAttribute('stroke', accent);
    rotHandle.setAttribute('stroke-width', '1.5');
    rotHandle.setAttribute('data-handle', 'rotate');
    rotHandle.style.pointerEvents = 'all';
    rotHandle.style.cursor = 'grab';
    rotHandle.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
    this.svg!.appendChild(rotHandle);

    // Small curved arrow icon inside rotation handle
    const arrow = document.createElementNS(NS, 'path');
    arrow.setAttribute('d', `M ${rotX - 2} ${rotY - 1} A 3 3 0 1 1 ${rotX + 2} ${rotY + 1}`);
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', accent);
    arrow.setAttribute('stroke-width', '1');
    arrow.style.pointerEvents = 'none';
    this.svg!.appendChild(arrow);
    const arrowHead = document.createElementNS(NS, 'polygon');
    arrowHead.setAttribute('points', `${rotX + 3},${rotY + 1} ${rotX + 1},${rotY + 0} ${rotX + 1},${rotY + 2}`);
    arrowHead.setAttribute('fill', accent);
    arrowHead.style.pointerEvents = 'none';
    this.svg!.appendChild(arrowHead);
  }

  /** Get cursor for a handle position */
  private _cursorForHandle(pos: HandlePos, _rotationDeg: number): string {
    // L6: For now use static cursors. Extension: rotate cursor based on layer rotation.
    const cursors: Record<HandlePos, string> = {
      tl: 'nwse-resize', tr: 'nesw-resize',
      br: 'nwse-resize', bl: 'nesw-resize',
      top: 'ns-resize', bottom: 'ns-resize',
      left: 'ew-resize', right: 'ew-resize',
    };
    return cursors[pos] || 'default';
  }

  // ── Compute 4 world-space corners ─────────────────────────
  private _getWorldCorners(renderer: BaseLayerRenderer): ScreenCorner[] {
    renderer.mesh.updateMatrixWorld(true);
    const geo = renderer.mesh.geometry;
    geo.computeBoundingBox();
    const bbox = geo.boundingBox;
    if (!bbox) return [];

    const localCorners = [
      new THREE.Vector3(bbox.min.x, bbox.min.y, 0),
      new THREE.Vector3(bbox.max.x, bbox.min.y, 0),
      new THREE.Vector3(bbox.max.x, bbox.max.y, 0),
      new THREE.Vector3(bbox.min.x, bbox.max.y, 0),
    ];

    const matrix = renderer.mesh.matrixWorld;
    return localCorners.map((c) => {
      const world = c.clone().applyMatrix4(matrix);
      return this.cameraManager.worldToScreen(world.x, world.y);
    });
  }

  // ── MOVE GIZMO ────────────────────────────────────────────
  private _drawMoveGizmo(cx: number, cy: number, accent: string, white: string): void {
    const len = 40;
    const headSize = 8;
    this._arrow(cx, cy, cx + len, cy, headSize, '#ff3355', white, 'move-x');
    this._arrow(cx, cy, cx, cy - len, headSize, '#55dd33', white, 'move-y');
    this._compassRose(cx, cy, 8, accent, white);
    const sq = 7;
    const sqEl = this._rect(cx + sq, cy - sq * 1.5, sq, sq, '#ffdd44', 1, '#ffdd44');
    sqEl.setAttribute('data-gizmo', 'move-xy');
    sqEl.style.pointerEvents = 'all';
    sqEl.style.cursor = 'move';
    this.svg!.appendChild(sqEl);
  }

  // ── ROTATE GIZMO ──────────────────────────────────────────
  private _drawRotateGizmo(cx: number, cy: number, accent: string, white: string): void {
    const ringRadius = 50;
    const outerRadius = 65;
    const zRing = document.createElementNS(NS, 'circle');
    zRing.setAttribute('cx', String(cx));
    zRing.setAttribute('cy', String(cy));
    zRing.setAttribute('r', String(ringRadius));
    zRing.setAttribute('fill', 'none');
    zRing.setAttribute('stroke', '#3388ff');
    zRing.setAttribute('stroke-width', '2');
    zRing.setAttribute('data-gizmo', 'rotate-z');
    zRing.style.pointerEvents = 'all';
    zRing.style.cursor = 'grab';
    this.svg!.appendChild(zRing);

    const outerRing = document.createElementNS(NS, 'circle');
    outerRing.setAttribute('cx', String(cx));
    outerRing.setAttribute('cy', String(cy));
    outerRing.setAttribute('r', String(outerRadius));
    outerRing.setAttribute('fill', 'none');
    outerRing.setAttribute('stroke', 'rgba(255,255,255,0.3)');
    outerRing.setAttribute('stroke-width', '1');
    outerRing.setAttribute('stroke-dasharray', '4 3');
    outerRing.setAttribute('data-gizmo', 'rotate-free');
    outerRing.style.pointerEvents = 'all';
    outerRing.style.cursor = 'grab';
    this.svg!.appendChild(outerRing);

    this._dot(cx, cy, 4, white, accent);
    this._compassRose(cx, cy, 6, accent, white);
  }

  // ── SCALE GIZMO ───────────────────────────────────────────
  private _drawScaleGizmo(cx: number, cy: number, accent: string, white: string): void {
    const len = 40;
    const tipSize = 9;
    this._arrowSquare(cx, cy, cx + len, cy, tipSize, '#ff3355', white, 'scale-x');
    this._arrowSquare(cx, cy, cx, cy - len, tipSize, '#55dd33', white, 'scale-y');

    const uSize = 11;
    const uEl = this._rect(cx - uSize / 2, cy - uSize / 2, uSize, uSize, '#ffffff', 1.5, 'rgba(255,255,255,0.15)');
    uEl.setAttribute('data-gizmo', 'scale-uniform');
    uEl.style.pointerEvents = 'all';
    uEl.style.cursor = 'nwse-resize';
    this.svg!.appendChild(uEl);

    this._compassRose(cx, cy, 6, accent, white);
  }

  // ── N3: Anchor crosshair — larger, double-color for visibility ──
  private _drawAnchor(worldX: number, worldY: number): void {
    const screen = this.cameraManager.worldToScreen(worldX, worldY);
    const cs = 10; // 12px crosshair
    // White outer lines for contrast on any background
    this.svg!.appendChild(this._line(screen.x - cs, screen.y, screen.x + cs, screen.y, '#ffffff', 2));
    this.svg!.appendChild(this._line(screen.x, screen.y - cs, screen.x, screen.y + cs, '#ffffff', 2));
    // Accent inner lines on top
    this.svg!.appendChild(this._line(screen.x - cs, screen.y, screen.x + cs, screen.y, '#4772b3', 1));
    this.svg!.appendChild(this._line(screen.x, screen.y - cs, screen.x, screen.y + cs, '#4772b3', 1));
    // 4px filled dot at center
    this._dot(screen.x, screen.y, 4, '#ffffff', '#4772b3');
  }

  // ── SVG helpers ─────────────────────────────────────────
  private _rect(x: number, y: number, w: number, h: number,
                stroke: string, sw: number, fill: string): SVGRectElement {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(x));
    r.setAttribute('y', String(y));
    r.setAttribute('width', String(w));
    r.setAttribute('height', String(h));
    r.setAttribute('stroke', stroke);
    r.setAttribute('stroke-width', String(sw));
    r.setAttribute('fill', fill);
    return r;
  }

  private _line(x1: number, y1: number, x2: number, y2: number,
                stroke: string, sw: number): SVGLineElement {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', String(x1));
    l.setAttribute('y1', String(y1));
    l.setAttribute('x2', String(x2));
    l.setAttribute('y2', String(y2));
    l.setAttribute('stroke', stroke);
    l.setAttribute('stroke-width', String(sw));
    return l;
  }

  private _dot(cx: number, cy: number, r: number, fill: string, stroke: string): void {
    const d = document.createElementNS(NS, 'circle');
    d.setAttribute('cx', String(cx));
    d.setAttribute('cy', String(cy));
    d.setAttribute('r', String(r));
    d.setAttribute('fill', fill);
    if (stroke !== 'none') {
      d.setAttribute('stroke', stroke);
      d.setAttribute('stroke-width', '0.5');
    }
    this.svg!.appendChild(d);
  }

  private _arrow(x1: number, y1: number, x2: number, y2: number,
                 headSize: number, color: string, stroke: string, dataAttr: string): void {
    const line = this._line(x1, y1, x2, y2, color, 2);
    line.style.pointerEvents = 'all';
    line.style.cursor = 'pointer';
    line.setAttribute('data-gizmo', dataAttr);
    this.svg!.appendChild(line);

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const tip = document.createElementNS(NS, 'polygon');
    const px = x2, py = y2;
    const points = [
      px + headSize * Math.cos(angle),
      py + headSize * Math.sin(angle),
      px + headSize * 0.5 * Math.cos(angle + Math.PI * 0.7),
      py + headSize * 0.5 * Math.sin(angle + Math.PI * 0.7),
      px + headSize * 0.5 * Math.cos(angle - Math.PI * 0.7),
      py + headSize * 0.5 * Math.sin(angle - Math.PI * 0.7),
    ];
    tip.setAttribute('points', points.join(' '));
    tip.setAttribute('fill', color);
    tip.setAttribute('stroke', stroke);
    tip.setAttribute('stroke-width', '0.5');
    tip.setAttribute('data-gizmo', dataAttr);
    tip.style.pointerEvents = 'all';
    tip.style.cursor = 'pointer';
    this.svg!.appendChild(tip);
  }

  private _arrowSquare(x1: number, y1: number, x2: number, y2: number,
                       tipSize: number, color: string, stroke: string, dataAttr: string): void {
    const line = this._line(x1, y1, x2, y2, color, 2);
    line.style.pointerEvents = 'all';
    line.style.cursor = 'pointer';
    line.setAttribute('data-gizmo', dataAttr);
    this.svg!.appendChild(line);

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const sq = document.createElementNS(NS, 'rect');
    const px = x2 + tipSize * Math.cos(angle) * 0.7;
    const py = y2 + tipSize * Math.sin(angle) * 0.7;
    sq.setAttribute('x', String(px - tipSize / 2));
    sq.setAttribute('y', String(py - tipSize / 2));
    sq.setAttribute('width', String(tipSize));
    sq.setAttribute('height', String(tipSize));
    sq.setAttribute('fill', color);
    sq.setAttribute('stroke', stroke);
    sq.setAttribute('stroke-width', '0.5');
    sq.setAttribute('data-gizmo', dataAttr);
    sq.style.pointerEvents = 'all';
    sq.style.cursor = 'pointer';
    this.svg!.appendChild(sq);
  }

  private _compassRose(cx: number, cy: number, radius: number, accent: string, white: string): void {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(radius * 0.5));
    circle.setAttribute('fill', accent);
    circle.setAttribute('stroke', white);
    circle.setAttribute('stroke-width', '0.5');
    circle.setAttribute('data-gizmo', 'pivot');
    circle.style.pointerEvents = 'all';
    circle.style.cursor = 'move';
    this.svg!.appendChild(circle);

    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const tipX = cx + radius * Math.cos(a);
      const tipY = cy + radius * Math.sin(a);
      const baseDist = radius * 0.6;
      const b1a = a + Math.PI * 0.25;
      const b2a = a - Math.PI * 0.25;
      const tri = document.createElementNS(NS, 'polygon');
      tri.setAttribute('points', [
        tipX, tipY,
        cx + baseDist * Math.cos(b1a), cy + baseDist * Math.sin(b1a),
        cx + baseDist * Math.cos(b2a), cy + baseDist * Math.sin(b2a),
      ].join(' '));
      tri.setAttribute('fill', accent);
      tri.setAttribute('stroke', white);
      tri.setAttribute('stroke-width', '0.3');
      this.svg!.appendChild(tri);
    }
  }

  // ── Public API ──────────────────────────────────────────
  show(): void { this._visible = true; }
  hide(): void { this._visible = false; this.update([]); }
  get visible(): boolean { return this._visible; }

  dispose(): void { this.unmount(); }
}
