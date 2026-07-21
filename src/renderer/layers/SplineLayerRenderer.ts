/**
 * SplineLayerRenderer — renders a Bezier spline with:
 *   - Full handle editing (in/out per point)
 *   - Animatable trim path (trimStart / trimEnd) for draw-on animation
 *   - Fill (closed paths only) and stroke
 */
import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { SplineData, SplinePoint } from '../../types/spline';

const DPI = 2;
const PAD = 20;

export class SplineLayerRenderer extends BaseLayerRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _tex: THREE.CanvasTexture;
  private _data: SplineData;
  private _w = 200;
  private _h = 200;
  private _cacheKey = '';

  constructor(id: string, data: SplineData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(256, 256);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthTest: false,
      premultipliedAlpha: false, side: THREE.DoubleSide,
    });
    super(id, geo, mat);
    this._canvas = canvas;
    this._ctx = ctx;
    this._tex = tex;
    this._data = data;
    this._render();
  }

  updateData(data: SplineData): void {
    const key = JSON.stringify(data);
    if (key === this._cacheKey) return;
    this._data = data;
    this._cacheKey = key;
    this._render();
  }

  private _render(): void {
    const d = this._data;
    if (d.points.length < 2) {
      this._canvas.width = 1;
      this._canvas.height = 1;
      this._tex.needsUpdate = true;
      return;
    }

    // Compute bounding box of all control points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of d.points) {
      minX = Math.min(minX, pt.x, pt.x + pt.inHandle.x, pt.x + pt.outHandle.x);
      minY = Math.min(minY, pt.y, pt.y + pt.inHandle.y, pt.y + pt.outHandle.y);
      maxX = Math.max(maxX, pt.x, pt.x + pt.inHandle.x, pt.x + pt.outHandle.x);
      maxY = Math.max(maxY, pt.y, pt.y + pt.inHandle.y, pt.y + pt.outHandle.y);
    }

    const logW = Math.max(1, maxX - minX) + PAD * 2;
    const logH = Math.max(1, maxY - minY) + PAD * 2;
    const cw = Math.ceil(logW * DPI);
    const ch = Math.ceil(logH * DPI);

    if (this._canvas.width !== cw || this._canvas.height !== ch) {
      this._canvas.width = cw;
      this._canvas.height = ch;
    }

    const ctx = this._ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.scale(DPI, DPI);

    // Offset so content is centered in canvas
    const offX = -minX + PAD;
    const offY = -minY + PAD;

    // Build full path
    const fullPath = this._buildPath(d.points, d.closed, offX, offY);

    // Trim path
    const trimStart = d.trimStart ?? 0;
    const trimEnd = d.trimEnd ?? 1;
    const needsTrim = trimStart > 0 || trimEnd < 1;

    if (needsTrim) {
      this._drawTrimmedPath(ctx, d.points, d.closed, offX, offY, trimStart, trimEnd, d);
    } else {
      // Fill (closed paths)
      if (d.closed && d.fillOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = d.fillOpacity / 100;
        ctx.fillStyle = d.fillColor;
        ctx.fill(fullPath, 'nonzero');
        ctx.restore();
      }
      // Stroke
      if (d.strokeOpacity > 0 && d.strokeWidth > 0) {
        ctx.save();
        ctx.globalAlpha = d.strokeOpacity / 100;
        ctx.strokeStyle = d.strokeColor;
        ctx.lineWidth = d.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(fullPath);
        ctx.restore();
      }
    }

    // Update geometry size
    const newGeo = new THREE.PlaneGeometry(logW, logH);
    const oldGeo = this.geometry;
    this.mesh.geometry = newGeo;
    (this as any).geometry = newGeo;
    oldGeo.dispose();
    this._tex.needsUpdate = true;
    this._w = logW;
    this._h = logH;
  }

  private _buildPath(
    points: SplinePoint[],
    closed: boolean,
    offX: number,
    offY: number,
  ): Path2D {
    const p = new Path2D();
    if (points.length === 0) return p;

    p.moveTo(points[0].x + offX, points[0].y + offY);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const c1x = prev.x + offX + prev.outHandle.x;
      const c1y = prev.y + offY + prev.outHandle.y;
      const c2x = curr.x + offX + curr.inHandle.x;
      const c2y = curr.y + offY + curr.inHandle.y;
      p.bezierCurveTo(c1x, c1y, c2x, c2y, curr.x + offX, curr.y + offY);
    }

    if (closed && points.length > 1) {
      const last = points[points.length - 1];
      const first = points[0];
      const c1x = last.x + offX + last.outHandle.x;
      const c1y = last.y + offY + last.outHandle.y;
      const c2x = first.x + offX + first.inHandle.x;
      const c2y = first.y + offY + first.inHandle.y;
      p.bezierCurveTo(c1x, c1y, c2x, c2y, first.x + offX, first.y + offY);
      p.closePath();
    }
    return p;
  }

  /**
   * Draw trimmed path using canvas dashing trick.
   * Computes total arc length, then applies a dash pattern that only draws
   * the portion from trimStart*length to trimEnd*length.
   */
  private _drawTrimmedPath(
    ctx: CanvasRenderingContext2D,
    points: SplinePoint[],
    closed: boolean,
    offX: number,
    offY: number,
    trimStart: number,
    trimEnd: number,
    d: SplineData,
  ): void {
    const path = this._buildPath(points, closed, offX, offY);

    // Approximate total length by sampling
    const totalLen = this._approximateLength(points, closed);

    const drawStart = trimStart * totalLen;
    const drawLen = (trimEnd - trimStart) * totalLen;

    if (drawLen <= 0) return;

    ctx.save();
    ctx.globalAlpha = d.strokeOpacity / 100;
    ctx.strokeStyle = d.strokeColor;
    ctx.lineWidth = d.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([drawLen, totalLen]);
    ctx.lineDashOffset = -drawStart;
    ctx.stroke(path);
    ctx.restore();
  }

  private _approximateLength(points: SplinePoint[], closed: boolean): number {
    const STEPS = 100;
    let totalLen = 0;
    const allPts = closed ? [...points, points[0]] : points;

    for (let i = 1; i < allPts.length; i++) {
      const prev = allPts[i - 1];
      const curr = allPts[i];
      let prevX = prev.x, prevY = prev.y;
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const mt = 1 - t;
        const x = mt*mt*mt * prev.x
          + 3*mt*mt*t * (prev.x + prev.outHandle.x)
          + 3*mt*t*t * (curr.x + curr.inHandle.x)
          + t*t*t * curr.x;
        const y = mt*mt*mt * prev.y
          + 3*mt*mt*t * (prev.y + prev.outHandle.y)
          + 3*mt*t*t * (curr.y + curr.inHandle.y)
          + t*t*t * curr.y;
        totalLen += Math.hypot(x - prevX, y - prevY);
        prevX = x; prevY = y;
      }
    }
    return totalLen;
  }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }
}
