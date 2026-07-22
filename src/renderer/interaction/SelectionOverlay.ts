/**
 * SelectionOverlay — draws selection outline, bounding box handles,
 * tool gizmos, and anchor crosshair as an SVG overlay.
 *
 * Layer stack (bottom to top):
 * 1. Selection polygon (oriented bounding box outline)
 * 2. Bounding box handles (8 resize + 1 rotation)
 * 3. Tool gizmo (move/rotate/scale arrows/rings)
 * 4. Anchor crosshair
 */
import * as THREE from 'three';
import type { CameraManager } from '../CameraManager';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import { useCompositionStore } from '../../state/compositionStore';
import { useViewportStore } from '../../state/viewportStore';

export type GizmoMode = 'move' | 'rotate' | 'scale' | null;

const NS = 'http://www.w3.org/2000/svg';

interface ScreenPt {
  x: number;
  y: number;
}

type HandlePos =
  | 'tl' | 'tr' | 'br' | 'bl'
  | 'top' | 'right' | 'bottom' | 'left';

// ── Theme ────────────────────────────────────────────────────

const THEME = {
  accent: '#4a90d9',
  accentDim: 'rgba(74,144,217,0.5)',
  white: '#ffffff',
  shadow: 'rgba(0,0,0,0.35)',
  axisX: '#e05555',
  axisY: '#55c05a',
  axisZ: '#4488ee',
  axisXY: '#eebb44',
  handleSize: 8,
  edgeHandleSize: 6,
  rotHandleRadius: 6,
  rotHandleOffset: 28,
  gizmoLength: 44,
  gizmoHeadSize: 8,
  anchorSize: 10,
  anchorHitRadius: 14,
} as const;

// ── Cursor map ───────────────────────────────────────────────

const HANDLE_CURSORS: Record<HandlePos, string> = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  br: 'nwse-resize',
  bl: 'nesw-resize',
  top: 'ns-resize',
  bottom: 'ns-resize',
  left: 'ew-resize',
  right: 'ew-resize',
};

// Reusable math objects
const _vec3 = new THREE.Vector3();
const _worldPos = new THREE.Vector3();

export class SelectionOverlay {
  private container: HTMLElement;
  private cameraManager: CameraManager;
  private svg: SVGSVGElement | null = null;

  private _visible = false;
  private _gizmoMode: GizmoMode = null;
  private _hideHandles = false;
  private _lastSelectedId: string | null = null;
  private _is3D = false;

  // Cached groups for efficient partial updates
  private _outlineGroup: SVGGElement | null = null;
  private _handleGroup: SVGGElement | null = null;
  private _gizmoGroup: SVGGElement | null = null;
  private _anchorGroup: SVGGElement | null = null;

  constructor(container: HTMLElement, cameraManager: CameraManager) {
    this.container = container;
    this.cameraManager = cameraManager;
  }

  set gizmoMode(mode: GizmoMode) { this._gizmoMode = mode; }
  get gizmoMode(): GizmoMode { return this._gizmoMode; }

  set hideHandles(v: boolean) { this._hideHandles = v; }
  get hideHandles(): boolean { return this._hideHandles; }

  set lastSelectedId(id: string | null) { this._lastSelectedId = id; }
  get lastSelectedId(): string | null { return this._lastSelectedId; }

  // ── Lifecycle ─────────────────────────────────────────────

  mount(): void {
    if (this.svg) return;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('xmlns', NS);
    svg.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:25;width:100%;height:100%;overflow:visible';

    // Create layer groups in correct z-order
    this._outlineGroup = this._createGroup('outlines');
    this._handleGroup = this._createGroup('handles');
    this._gizmoGroup = this._createGroup('gizmo');
    this._anchorGroup = this._createGroup('anchors');

    svg.appendChild(this._outlineGroup);
    svg.appendChild(this._handleGroup);
    svg.appendChild(this._gizmoGroup);
    svg.appendChild(this._anchorGroup);

    this.container.appendChild(svg);
    this.svg = svg;
  }

  unmount(): void {
    this.svg?.parentElement?.removeChild(this.svg);
    this.svg = null;
    this._outlineGroup = null;
    this._handleGroup = null;
    this._gizmoGroup = null;
    this._anchorGroup = null;
  }

  show(): void { this._visible = true; }

  hide(): void {
    this._visible = false;
    this._clearAllGroups();
  }

  get visible(): boolean { return this._visible; }

  dispose(): void { this.unmount(); }

  // ── Main update ───────────────────────────────────────────

  update(renderers: BaseLayerRenderer[], is3D = false): void {
    if (!this.svg) return;
    this._clearAllGroups();

    if (renderers.length === 0 || !this._visible) return;

    this._is3D = is3D;

    // Filter non-visual layer types
    renderers = this._filterVisualRenderers(renderers);
    if (renderers.length === 0) return;

    const isMulti = renderers.length > 1;
    let allCorners: ScreenPt[] = [];
    let gizmoCenterWorld = new THREE.Vector3();
    let centerCount = 0;

    for (const r of renderers) {
      const corners = this._getScreenCorners(r);
      if (corners.length < 3) continue;

      // 1. Selection outline
      const isLast = isMulti && r.id === this._lastSelectedId;
      this._drawSelectionOutline(corners, isMulti, isLast);

      const layerIs3D = this._isLayer3D(r.id);

      // 2. Bounding box handles — SKIP for 3D layers (AE convention).
      // 3D layers use the AE cage gizmo (TransformGizmo3D) instead of the
      // 8 flat handles, since flat handles have no meaningful projection
      // in perspective view.
      if (!this._hideHandles && !layerIs3D && (!isMulti || isLast)) {
        this._drawHandles(corners, r.id);
      }

      // 4. Anchor crosshair — SKIP for 3D layers (needs a 3D anchor tool,
      // which is out of scope here; hiding avoids a broken drag hitbox).
      if (!layerIs3D && useViewportStore.getState().settings.showAnchorPoints) {
        r.group.getWorldPosition(_worldPos);
        this._drawAnchor(_worldPos.x, _worldPos.y, _worldPos.z);
      }

      allCorners = allCorners.concat(corners);
      r.group.getWorldPosition(_worldPos);
      gizmoCenterWorld.add(_worldPos);
      centerCount++;
    }

    if (centerCount === 0) return;

    // 3. Tool gizmo at selection center
    gizmoCenterWorld.divideScalar(centerCount);
    const gizmoScreen = this.cameraManager.worldToScreen(
      gizmoCenterWorld.x,
      gizmoCenterWorld.y,
      gizmoCenterWorld.z,
    );

    // Skip legacy SVG gizmo for any selection containing 3D layers —
    // TransformGizmo3D / RotationGizmo3D handle those.
    const anySelected3D = renderers.some(r => this._isLayer3D(r.id));
    if (this._gizmoMode && !anySelected3D) {
      this._drawGizmo(gizmoScreen.x, gizmoScreen.y);
    }
  }

  // ── Selection outline ─────────────────────────────────────

  private _drawSelectionOutline(
    corners: ScreenPt[],
    isMulti: boolean,
    isLastSelected: boolean,
  ): void {
    const g = this._outlineGroup!;
    const pts = corners.map((c) => `${c.x},${c.y}`).join(' ');

    // Shadow outline
    const shadow = this._createPolygon(pts, 'none', THEME.shadow,
      isLastSelected ? 4 : 3,
    );
    g.appendChild(shadow);

    // Color outline
    let stroke: string;
    let strokeWidth: number;

    if (isLastSelected) {
      stroke = THEME.white;
      strokeWidth = 2.5;
    } else if (isMulti) {
      stroke = THEME.accentDim;
      strokeWidth = 1.5;
    } else {
      stroke = THEME.accent;
      strokeWidth = 1.5;
    }

    const outline = this._createPolygon(pts, 'none', stroke, strokeWidth);
    g.appendChild(outline);
  }

  // ── Bounding box handles ──────────────────────────────────

  private _drawHandles(corners: ScreenPt[], layerId: string): void {
    if (corners.length < 4) return;
    const g = this._handleGroup!;

    // Use the first 4 corners as the quad (TL, TR, BR, BL)
    const [tl, tr, br, bl] = corners;

    const cornerHandles: Array<{ pos: HandlePos; pt: ScreenPt }> = [
      { pos: 'tl', pt: tl },
      { pos: 'tr', pt: tr },
      { pos: 'br', pt: br },
      { pos: 'bl', pt: bl },
    ];

    const edgeHandles: Array<{ pos: HandlePos; pt: ScreenPt }> = [
      { pos: 'top', pt: this._midpoint(tl, tr) },
      { pos: 'right', pt: this._midpoint(tr, br) },
      { pos: 'bottom', pt: this._midpoint(br, bl) },
      { pos: 'left', pt: this._midpoint(bl, tl) },
    ];

    // Corner handles
    for (const h of cornerHandles) {
      const el = this._createHandle(
        h.pt.x, h.pt.y,
        THEME.handleSize, THEME.handleSize,
        h.pos, layerId,
      );
      g.appendChild(el);
    }

    // Edge handles
    for (const h of edgeHandles) {
      const el = this._createHandle(
        h.pt.x, h.pt.y,
        THEME.edgeHandleSize, THEME.edgeHandleSize,
        h.pos, layerId,
      );
      g.appendChild(el);
    }

    // Rotation handle
    this._drawRotationHandle(tl, tr, layerId);
  }

  private _drawRotationHandle(
    tl: ScreenPt,
    tr: ScreenPt,
    layerId: string,
  ): void {
    const g = this._handleGroup!;

    const midTop = this._midpoint(tl, tr);
    const edgeDx = tr.x - tl.x;
    const edgeDy = tr.y - tl.y;
    const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;

    // Outward normal from top edge
    const nx = -edgeDy / edgeLen;
    const ny = edgeDx / edgeLen;

    const rx = midTop.x + nx * THEME.rotHandleOffset;
    const ry = midTop.y + ny * THEME.rotHandleOffset;

    // Connector line (dashed)
    const connector = document.createElementNS(NS, 'line');
    this._setAttrs(connector, {
      x1: midTop.x, y1: midTop.y,
      x2: rx, y2: ry,
      stroke: THEME.accent,
      'stroke-width': 1,
      'stroke-dasharray': '3 2',
    });
    connector.style.pointerEvents = 'none';
    g.appendChild(connector);

    // Handle circle
    const circle = document.createElementNS(NS, 'circle');
    this._setAttrs(circle, {
      cx: rx, cy: ry,
      r: THEME.rotHandleRadius,
      fill: THEME.white,
      stroke: THEME.accent,
      'stroke-width': 1.5,
      'data-handle': 'rotate',
      'data-layer-id': layerId,
    });
    circle.style.pointerEvents = 'all';
    circle.style.cursor = 'grab';
    g.appendChild(circle);

    // Curved arrow icon
    const iconR = THEME.rotHandleRadius * 0.45;
    const arc = document.createElementNS(NS, 'path');
    arc.setAttribute(
      'd',
      `M ${rx - iconR} ${ry - iconR * 0.3} A ${iconR} ${iconR} 0 1 1 ${rx + iconR} ${ry + iconR * 0.3}`,
    );
    this._setAttrs(arc, {
      fill: 'none',
      stroke: THEME.accent,
      'stroke-width': 1,
      'stroke-linecap': 'round',
    });
    arc.style.pointerEvents = 'none';
    g.appendChild(arc);
  }

  private _createHandle(
    cx: number,
    cy: number,
    w: number,
    h: number,
    pos: HandlePos,
    layerId: string,
  ): SVGRectElement {
    const rect = document.createElementNS(NS, 'rect');
    this._setAttrs(rect, {
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      fill: THEME.white,
      stroke: THEME.accent,
      'stroke-width': 1,
      rx: 1,
      ry: 1,
      'data-handle': pos,
      'data-layer-id': layerId,
    });
    rect.style.pointerEvents = 'all';
    rect.style.cursor = HANDLE_CURSORS[pos] ?? 'default';
    rect.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))';
    return rect;
  }

  // ── Gizmo ─────────────────────────────────────────────────

  private _drawGizmo(cx: number, cy: number): void {
    switch (this._gizmoMode) {
      case 'move': this._drawMoveGizmo(cx, cy); break;
      case 'rotate': this._drawRotateGizmo(cx, cy); break;
      case 'scale': this._drawScaleGizmo(cx, cy); break;
    }
  }

  private _drawMoveGizmo(cx: number, cy: number): void {
    const g = this._gizmoGroup!;
    const len = THEME.gizmoLength;
    const head = THEME.gizmoHeadSize;

    // X axis
    this._appendArrow(g, cx, cy, cx + len, cy, head, THEME.axisX, 'move-x');
    // Y axis
    this._appendArrow(g, cx, cy, cx, cy - len, head, THEME.axisY, 'move-y');

    // Z axis (3D only)
    if (this._is3D) {
      const zLen = len * 0.65;
      const zAngle = Math.PI * 0.25;
      const zx = cx + zLen * Math.cos(zAngle);
      const zy = cy + zLen * Math.sin(zAngle);
      this._appendArrow(g, cx, cy, zx, zy, head * 0.7, THEME.axisZ, 'move-z');

      const label = document.createElementNS(NS, 'text');
      this._setAttrs(label, {
        x: zx + 8, y: zy + 3,
        fill: THEME.axisZ,
        'font-size': 9,
        'font-weight': 'bold',
        'font-family': 'system-ui, sans-serif',
        'data-gizmo': 'move-z',
      });
      label.textContent = 'Z';
      label.style.pointerEvents = 'all';
      label.style.cursor = 'pointer';
      g.appendChild(label);
    }

    // XY plane square
    const sq = 8;
    const xyRect = document.createElementNS(NS, 'rect');
    this._setAttrs(xyRect, {
      x: cx + sq * 0.5,
      y: cy - sq * 1.5,
      width: sq,
      height: sq,
      fill: THEME.axisXY,
      'fill-opacity': 0.4,
      stroke: THEME.axisXY,
      'stroke-width': 1,
      'data-gizmo': 'move-xy',
    });
    xyRect.style.pointerEvents = 'all';
    xyRect.style.cursor = 'move';
    g.appendChild(xyRect);

    // Center dot
    this._appendDot(g, cx, cy, 3.5, THEME.white, THEME.accent);
  }

  private _drawRotateGizmo(cx: number, cy: number): void {
    const g = this._gizmoGroup!;

    // Z rotation ring
    const zRing = document.createElementNS(NS, 'circle');
    this._setAttrs(zRing, {
      cx, cy, r: 50,
      fill: 'none',
      stroke: THEME.axisZ,
      'stroke-width': 2,
      'data-gizmo': 'rotate-z',
    });
    zRing.style.pointerEvents = 'all';
    zRing.style.cursor = 'grab';
    g.appendChild(zRing);

    // Free rotation ring (outer, dashed)
    const freeRing = document.createElementNS(NS, 'circle');
    this._setAttrs(freeRing, {
      cx, cy, r: 62,
      fill: 'none',
      stroke: 'rgba(255,255,255,0.2)',
      'stroke-width': 1,
      'stroke-dasharray': '4 3',
      'data-gizmo': 'rotate-free',
    });
    freeRing.style.pointerEvents = 'all';
    freeRing.style.cursor = 'grab';
    g.appendChild(freeRing);

    // Tick marks at 45° intervals
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const inner = 47;
      const outer = 53;
      const tick = document.createElementNS(NS, 'line');
      this._setAttrs(tick, {
        x1: cx + inner * Math.cos(a),
        y1: cy + inner * Math.sin(a),
        x2: cx + outer * Math.cos(a),
        y2: cy + outer * Math.sin(a),
        stroke: 'rgba(255,255,255,0.3)',
        'stroke-width': 1,
      });
      tick.style.pointerEvents = 'none';
      g.appendChild(tick);
    }

    this._appendDot(g, cx, cy, 3, THEME.white, THEME.accent);
  }

  private _drawScaleGizmo(cx: number, cy: number): void {
    const g = this._gizmoGroup!;
    const len = THEME.gizmoLength;
    const tip = 7;

    // X axis with square tip
    this._appendScaleArrow(g, cx, cy, cx + len, cy, tip, THEME.axisX, 'scale-x');
    // Y axis with square tip
    this._appendScaleArrow(g, cx, cy, cx, cy - len, tip, THEME.axisY, 'scale-y');

    // Uniform scale handle (center square)
    const us = 10;
    const uRect = document.createElementNS(NS, 'rect');
    this._setAttrs(uRect, {
      x: cx - us / 2,
      y: cy - us / 2,
      width: us,
      height: us,
      fill: 'rgba(255,255,255,0.12)',
      stroke: THEME.white,
      'stroke-width': 1.5,
      rx: 1,
      'data-gizmo': 'scale-uniform',
    });
    uRect.style.pointerEvents = 'all';
    uRect.style.cursor = 'nwse-resize';
    g.appendChild(uRect);

    this._appendDot(g, cx, cy, 2.5, THEME.accent, THEME.white);
  }

  // ── Anchor crosshair ──────────────────────────────────────

  private _drawAnchor(
    worldX: number,
    worldY: number,
    worldZ = 0,
  ): void {
    const g = this._anchorGroup!;
    const screen = this.cameraManager.worldToScreen(
      worldX, worldY, worldZ,
    );
    if (!isFinite(screen.x) || !isFinite(screen.y)) return;

    const cs = THEME.anchorSize;
    const { x, y } = screen;

    // Hit area (invisible, large)
    const hit = document.createElementNS(NS, 'circle');
    this._setAttrs(hit, {
      cx: x, cy: y,
      r: THEME.anchorHitRadius,
      fill: 'transparent',
      'data-anchor': 'true',
    });
    hit.style.pointerEvents = 'all';
    hit.style.cursor = 'move';
    g.appendChild(hit);

    // White shadow crosshair
    this._appendCrosshairLines(g, x, y, cs, THEME.white, 2.5, true);
    // Accent crosshair
    this._appendCrosshairLines(g, x, y, cs, THEME.accent, 1, true);

    // Center dot
    const dot = document.createElementNS(NS, 'circle');
    this._setAttrs(dot, {
      cx: x, cy: y, r: 3,
      fill: THEME.white,
      stroke: THEME.accent,
      'stroke-width': 0.5,
    });
    dot.style.pointerEvents = 'none';
    g.appendChild(dot);
  }

  private _appendCrosshairLines(
    parent: SVGGElement,
    cx: number,
    cy: number,
    size: number,
    color: string,
    width: number,
    noEvents: boolean,
  ): void {
    const h = document.createElementNS(NS, 'line');
    this._setAttrs(h, {
      x1: cx - size, y1: cy, x2: cx + size, y2: cy,
      stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
    });
    if (noEvents) h.style.pointerEvents = 'none';
    parent.appendChild(h);

    const v = document.createElementNS(NS, 'line');
    this._setAttrs(v, {
      x1: cx, y1: cy - size, x2: cx, y2: cy + size,
      stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
    });
    if (noEvents) v.style.pointerEvents = 'none';
    parent.appendChild(v);
  }

  // ── 3D layer detection ────────────────────────────────────

  /** Check if a specific layer is flagged 3D (from composition store). */
  private _isLayer3D(layerId: string): boolean {
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find(c => c.id === cs.activeCompositionId)
      : null;
    const layer = comp?.layers.find(l => l.id === layerId);
    return !!layer?.is3D;
  }

  // ── Screen corner computation ─────────────────────────────

  private _getScreenCorners(renderer: BaseLayerRenderer): ScreenPt[] {
    // Ask the renderer for its true world-space AABB corners. This lets
    // Model3DLayerRenderer return the actual loaded-model bounds instead of
    // the invisible 1×1×1 proxy mesh that BaseLayerRenderer holds.
    const worldCorners = (renderer as any).getWorldAABBCorners?.() as
      | THREE.Vector3[]
      | null
      | undefined;

    // In 3D perspective mode, project all 8 world corners and take the
    // convex hull for a silhouette outline that follows the camera view.
    if (this.cameraManager.is3DMode && worldCorners && worldCorners.length > 0) {
      const screen: ScreenPt[] = [];
      for (const w of worldCorners) {
        const s = this.cameraManager.worldToScreen(w.x, w.y, w.z);
        if (isFinite(s.x) && isFinite(s.y)) screen.push(s);
      }
      if (screen.length < 3) return [];
      return this._convexHull(screen);
    }

    // 2D mode: use the original local-XY corner path so the outline is
    // an axis-aligned or rotated rectangle (not a full 8-corner hull).
    const bbox = renderer.getLocalBoundingBox();
    if (!bbox) return [];

    renderer.group.updateMatrixWorld(true);
    const matrix = renderer.mesh.matrixWorld;

    const pts2d: ScreenPt[] = [];
    const localCorners = [
      [bbox.min.x, bbox.min.y],
      [bbox.max.x, bbox.min.y],
      [bbox.max.x, bbox.max.y],
      [bbox.min.x, bbox.max.y],
    ];

    for (const [lx, ly] of localCorners) {
      _vec3.set(lx, ly, 0).applyMatrix4(matrix);
      pts2d.push(this.cameraManager.worldToScreen(_vec3.x, _vec3.y));
    }
    return pts2d;
  }

  private _convexHull(points: ScreenPt[]): ScreenPt[] {
    if (points.length <= 2) return points;

    const sorted = [...points].sort(
      (a, b) => a.x - b.x || a.y - b.y,
    );

    const cross = (o: ScreenPt, a: ScreenPt, b: ScreenPt) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower: ScreenPt[] = [];
    for (const p of sorted) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
      ) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: ScreenPt[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
      ) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();

    return lower.concat(upper);
  }

  // ── Filtering ─────────────────────────────────────────────

  private _filterVisualRenderers(
    renderers: BaseLayerRenderer[],
  ): BaseLayerRenderer[] {
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
      : null;

    if (!comp) return renderers;

    const layerMap = new Map(comp.layers.map((l) => [l.id, l]));
    const excluded = new Set(['adjustment', 'light', 'camera']);

    return renderers.filter((r) => {
      const layer = layerMap.get(r.id);
      return layer && !excluded.has(layer.type);
    });
  }

  // ── SVG helpers ───────────────────────────────────────────

  private _createGroup(name: string): SVGGElement {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('data-group', name);
    return g;
  }

  private _clearAllGroups(): void {
    this._outlineGroup && (this._outlineGroup.innerHTML = '');
    this._handleGroup && (this._handleGroup.innerHTML = '');
    this._gizmoGroup && (this._gizmoGroup.innerHTML = '');
    this._anchorGroup && (this._anchorGroup.innerHTML = '');
  }

  private _setAttrs(
    el: SVGElement,
    attrs: Record<string, string | number>,
  ): void {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
  }

  private _createPolygon(
    points: string,
    fill: string,
    stroke: string,
    strokeWidth: number,
  ): SVGPolygonElement {
    const poly = document.createElementNS(NS, 'polygon');
    this._setAttrs(poly, {
      points,
      fill,
      stroke,
      'stroke-width': strokeWidth,
      'stroke-linejoin': 'round',
    });
    return poly;
  }

  private _midpoint(a: ScreenPt, b: ScreenPt): ScreenPt {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private _appendDot(
    parent: SVGGElement,
    cx: number,
    cy: number,
    r: number,
    fill: string,
    stroke: string,
  ): void {
    const dot = document.createElementNS(NS, 'circle');
    this._setAttrs(dot, {
      cx, cy, r,
      fill,
      stroke,
      'stroke-width': 0.5,
    });
    dot.style.pointerEvents = 'none';
    parent.appendChild(dot);
  }

  private _appendArrow(
    parent: SVGGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    headSize: number,
    color: string,
    dataAttr: string,
  ): void {
    // Line
    const line = document.createElementNS(NS, 'line');
    this._setAttrs(line, {
      x1, y1, x2, y2,
      stroke: color,
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'data-gizmo': dataAttr,
    });
    line.style.pointerEvents = 'all';
    line.style.cursor = 'pointer';
    parent.appendChild(line);

    // Arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const tip = document.createElementNS(NS, 'polygon');
    const pts = [
      x2 + headSize * Math.cos(angle),
      y2 + headSize * Math.sin(angle),
      x2 + headSize * 0.45 * Math.cos(angle + Math.PI * 0.72),
      y2 + headSize * 0.45 * Math.sin(angle + Math.PI * 0.72),
      x2 + headSize * 0.45 * Math.cos(angle - Math.PI * 0.72),
      y2 + headSize * 0.45 * Math.sin(angle - Math.PI * 0.72),
    ];
    this._setAttrs(tip, {
      points: pts.join(' '),
      fill: color,
      stroke: 'rgba(0,0,0,0.2)',
      'stroke-width': 0.5,
      'data-gizmo': dataAttr,
    });
    tip.style.pointerEvents = 'all';
    tip.style.cursor = 'pointer';
    parent.appendChild(tip);
  }

  private _appendScaleArrow(
    parent: SVGGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tipSize: number,
    color: string,
    dataAttr: string,
  ): void {
    const line = document.createElementNS(NS, 'line');
    this._setAttrs(line, {
      x1, y1, x2, y2,
      stroke: color,
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'data-gizmo': dataAttr,
    });
    line.style.pointerEvents = 'all';
    line.style.cursor = 'pointer';
    parent.appendChild(line);

    // Square tip
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const tipCx = x2 + (tipSize * 0.5) * Math.cos(angle);
    const tipCy = y2 + (tipSize * 0.5) * Math.sin(angle);
    const sq = document.createElementNS(NS, 'rect');
    this._setAttrs(sq, {
      x: tipCx - tipSize / 2,
      y: tipCy - tipSize / 2,
      width: tipSize,
      height: tipSize,
      fill: color,
      stroke: 'rgba(0,0,0,0.2)',
      'stroke-width': 0.5,
      rx: 1,
      'data-gizmo': dataAttr,
    });
    sq.style.pointerEvents = 'all';
    sq.style.cursor = 'pointer';
    parent.appendChild(sq);
  }
}