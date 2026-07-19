import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { ShapeData, ShapeFill, ShapeStroke, GradientFill, PathCommand } from '../../types/layer';
import { PATH_BUILDERS } from '../../shapes/ShapePathBuilder';

const DPI = 2;
const MAX_TEX = 4096;

export class ShapeLayerRenderer extends BaseLayerRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _tex: THREE.CanvasTexture;
  private _data: ShapeData;
  private _w = 200;
  private _h = 200;
  private _cacheKey = '';

  constructor(id: string, data: ShapeData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    // Ensure transparent background
    ctx.clearRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.premultiplyAlpha = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      depthTest: false,
      transparent: true,
      premultipliedAlpha: false,
      side: THREE.DoubleSide,
    });
    super(id, geo, mat);
    this._canvas = canvas; this._ctx = ctx; this._tex = tex; this._data = data;
    this._render();
  }

  updateData(data: ShapeData): void {
    const key = JSON.stringify(data);
    if (key === this._cacheKey) return;
    this._data = data; this._cacheKey = key;
    this._render();
  }

  private _dims(): { w: number; h: number } {
    const d = this._data;
    if (d.type === 'rectangle') return { w: d.width, h: d.height };
    if (d.type === 'ellipse') return { w: d.radiusX * 2, h: d.radiusY * 2 };
    if (d.type === 'polygon' || d.type === 'star') return { w: d.radius * 2, h: d.radius * 2 };
    if (d.type === 'path') {
      const b = d.bounds;
      return { w: Math.max(1, b.maxX - b.minX), h: Math.max(1, b.maxY - b.minY) };
    }
    return { w: 200, h: 200 };
  }

  private _render(): void {
    const data = this._data;
    const stroke = (data as any).stroke as ShapeStroke | undefined;
    const strokeW = stroke?.enabled ? (stroke.width ?? 0) : 0;
    const pad = strokeW + 4;
    const { w, h } = this._dims();
    const logW = w + pad * 2;
    const logH = h + pad * 2;
    const cw = Math.min(MAX_TEX, Math.ceil(logW * DPI));
    const ch = Math.min(MAX_TEX, Math.ceil(logH * DPI));

    if (this._canvas.width !== cw || this._canvas.height !== ch) {
      this._canvas.width = cw; this._canvas.height = ch;
    }

    const ctx = this._ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.scale(DPI, DPI);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    const cx = logW / 2, cy = logH / 2;
    const path2d = this._buildPath2D(cx, cy, w, h);
    if (!path2d) {
      this._finalize(logW, logH);
      return;
    }

    const fill = (data as any).fill as ShapeFill | undefined;
    if (fill && fill.opacity > 0) {
      ctx.save();
      ctx.globalAlpha = fill.opacity / 100;
      const fillStyle = this._makeFillStyle(fill, cx, cy, w, h);
      ctx.fillStyle = fillStyle;
      ctx.fill(path2d, 'nonzero');
      ctx.restore();
    }

    if (stroke?.enabled && strokeW > 0) {
      ctx.save();
      ctx.globalAlpha = (stroke.opacity ?? 100) / 100;
      ctx.strokeStyle = (stroke.fillType && stroke.fillType !== 'solid' && stroke.gradient)
        ? this._makeGradStyle(stroke.gradient, cx, cy, w, h)
        : (stroke.color ?? '#ffffff');
      ctx.lineWidth = strokeW;
      ctx.lineCap = stroke.cap ?? 'butt';
      ctx.lineJoin = stroke.join ?? 'miter';
      ctx.setLineDash(stroke.dashArray?.length ? stroke.dashArray : []);
      ctx.lineDashOffset = stroke.dashOffset ?? 0;
      ctx.stroke(path2d);
      ctx.restore();
    }

    this._finalize(logW, logH);
  }

  private _finalize(logW: number, logH: number): void {
    const newGeo = new THREE.PlaneGeometry(logW, logH);
    const oldGeo = this.geometry;
    this.mesh.geometry = newGeo;
    (this as any).geometry = newGeo;
    oldGeo.dispose();
    this._tex.needsUpdate = true;
    this._w = logW; this._h = logH;
  }

  private _buildPath2D(cx: number, cy: number, w: number, h: number): Path2D | null {
    const data = this._data;
    if (data.type === 'path') {
      const b = data.bounds;
      const offX = cx - (b.minX + (b.maxX - b.minX) / 2);
      const offY = cy - (b.minY + (b.maxY - b.minY) / 2);
      return this._cmdsToPath2D(data.commands, offX, offY);
    }

    const pid = this._presetId();
    const params = this._params();
    const builder = PATH_BUILDERS[pid];
    if (builder) {
      const svgD = builder({ width: w, height: h, params });
      return this._svgToPath2D(svgD, cx, cy);
    }

    // Fallback for known types without preset builder
    if (data.type === 'rectangle') {
      const p = new Path2D();
      const r = Math.min(data.borderRadius ?? 0, w/2, h/2);
      if (r > 0 && (p as any).roundRect) {
        (p as any).roundRect(cx-w/2, cy-h/2, w, h, r);
      } else {
        p.rect(cx-w/2, cy-h/2, w, h);
      }
      return p;
    }
    if (data.type === 'ellipse') {
      const p = new Path2D();
      p.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2);
      return p;
    }

    // Ultimate fallback: rectangle
    const p = new Path2D();
    p.rect(cx - w/2, cy - h/2, w, h);
    return p;
  }

  private _presetId(): string {
    const d = this._data as any;
    if (d.presetId) return d.presetId;
    return d.type;
  }

  private _params(): Record<string, number> {
    const d = this._data as any;
    if (d.presetParams) return d.presetParams;
    if (d.type === 'rectangle') return { roundness: d.borderRadius ?? 0 };
    if (d.type === 'polygon') return { sides: d.sides, roundness: d.roundness };
    if (d.type === 'star') return { points: d.points, innerRatio: d.innerRadius / d.radius, roundness: d.roundness };
    return {};
  }

  private _svgToPath2D(svgPath: string, cx: number, cy: number): Path2D {
    const p = new Path2D();
    const tokens = svgPath.trim().match(/[A-Za-z]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) ?? [];
    let i = 0;
    const n = () => parseFloat(tokens[i++] ?? '0');
    while (i < tokens.length) {
      const cmd = tokens[i++];
      if (cmd === 'M') { p.moveTo(cx + n(), cy + n()); }
      else if (cmd === 'L') { p.lineTo(cx + n(), cy + n()); }
      else if (cmd === 'C') { const x1=n(),y1=n(),x2=n(),y2=n(),x=n(),y=n(); p.bezierCurveTo(cx+x1,cy+y1,cx+x2,cy+y2,cx+x,cy+y); }
      else if (cmd === 'Q') { const qx=n(),qy=n(),x=n(),y=n(); p.quadraticCurveTo(cx+qx,cy+qy,cx+x,cy+y); }
      else if (cmd === 'A') { const rx=n(),ry=n(); n(); n(); n(); const x=n(),y=n(); p.lineTo(cx+x,cy+y); }
      else if (cmd === 'Z' || cmd === 'z') { p.closePath(); }
    }
    return p;
  }

  private _cmdsToPath2D(commands: PathCommand[], offX: number, offY: number): Path2D {
    const p = new Path2D();
    for (const cmd of commands) {
      const pts = cmd.points;
      if (cmd.type === 'M') p.moveTo(pts[0] + offX, pts[1] + offY);
      else if (cmd.type === 'L') p.lineTo(pts[0] + offX, pts[1] + offY);
      else if (cmd.type === 'C') p.bezierCurveTo(pts[0]+offX, pts[1]+offY, pts[2]+offX, pts[3]+offY, pts[4]+offX, pts[5]+offY);
      else if (cmd.type === 'Q') p.quadraticCurveTo(pts[0]+offX, pts[1]+offY, pts[2]+offX, pts[3]+offY);
      else if (cmd.type === 'Z') p.closePath();
    }
    return p;
  }

  private _makeFillStyle(fill: ShapeFill, cx: number, cy: number, w: number, h: number): string | CanvasGradient {
    if (fill.type === 'solid' || !fill.gradient) return fill.color ?? '#ffffff';
    return this._makeGradStyle(fill.gradient, cx, cy, w, h);
  }

  private _makeGradStyle(g: GradientFill, cx: number, cy: number, w: number, h: number): CanvasGradient {
    const ctx = this._ctx;
    if (g.type === 'linear-gradient') {
      const rad = (g.angle * Math.PI) / 180;
      const dx = Math.cos(rad) * w/2, dy = Math.sin(rad) * h/2;
      const grad = ctx.createLinearGradient(cx-dx, cy-dy, cx+dx, cy+dy);
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    if (g.type === 'radial-gradient') {
      const rx = (g.centerX ?? 0.5) * w + (cx - w/2);
      const ry = (g.centerY ?? 0.5) * h + (cy - h/2);
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, (g.radius ?? 0.5) * Math.max(w, h));
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    // Conic
    const ang = ((g as any).angle ?? 0) * Math.PI / 180;
    if ((ctx as any).createConicGradient) {
      const grad = (ctx as any).createConicGradient(ang, cx, cy) as CanvasGradient;
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    // Fallback: linear
    const grad = ctx.createLinearGradient(cx - w/2, cy, cx + w/2, cy);
    for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
    return grad;
  }

  setFillColor(color: string): void {
    (this._data as any).fill = { ...((this._data as any).fill ?? { type: 'solid', opacity: 100 }), color, type: 'solid' };
    this._cacheKey = ''; this._render();
  }
  setFill(fill: ShapeFill): void {
    (this._data as any).fill = fill; this._cacheKey = ''; this._render();
  }
  setSize(w: number, h: number): void {
    if (this._data.type === 'rectangle') { (this._data as any).width = w; (this._data as any).height = h; }
    else if (this._data.type === 'ellipse') { (this._data as any).radiusX = w/2; (this._data as any).radiusY = h/2; }
    this._cacheKey = ''; this._render();
  }
  setFillOpacity(o: number): void {
    const d = this._data as any;
    d.fill = { ...(d.fill ?? { type: 'solid', color: '#fff' }), opacity: o * 100 };
    this._cacheKey = ''; this._render();
  }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }
}