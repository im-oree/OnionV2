import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { ShapeData, ShapeFill, ShapeStroke, GradientFill, PathCommand } from '../../types/layer';
import { PATH_BUILDERS } from '../../shapes/ShapePathBuilder';

const DPI = 2;
const MAX_TEX = 4096;

/** 3D shape types that use real Three.js geometries instead of canvas textures */
const SHAPES_3D = new Set(['sphere', 'cube', 'cylinder', 'torus', 'cone']);

export class ShapeLayerRenderer extends BaseLayerRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _tex: THREE.CanvasTexture;
  private _data: ShapeData;
  private _w = 200;
  private _h = 200;
  private _cacheKey = '';
  private _is3D = false;

  constructor(id: string, data: ShapeData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false })!;
    // Explicit transparent clear
    ctx.clearRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    // Straight-alpha â€” canvas 2D writes straight-alpha pixels.
    tex.premultiplyAlpha = false;
    tex.colorSpace = THREE.SRGBColorSpace;

    const presetId = (data as any).presetId ?? (data as any).type;
    const is3D = SHAPES_3D.has(presetId);

    let geo: THREE.BufferGeometry;
    let mat: THREE.Material;

    if (is3D) {
      geo = ShapeLayerRenderer._create3DGeometry(presetId, data);
      mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
      });
    } else {
      geo = new THREE.PlaneGeometry(200, 200);
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        depthTest: false,
        transparent: true,
        premultipliedAlpha: false,
        side: THREE.DoubleSide,
        // Explicit straight-alpha blending â€” prevents the black halo
        // that appears when the GPU premultiplies against a black clear.
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        blendEquation: THREE.AddEquation,
        alphaTest: 0.001, // discards fully-transparent pixels â€” kills black fringing
      });
    }

    super(id, geo, mat);
    this._canvas = canvas; this._ctx = ctx; this._tex = tex;
    this._data = data;
    this._is3D = is3D;

    if (is3D) this._apply3DMaterial();
    else this._render();
  }

  static _create3DGeometry(type: string, data: ShapeData): THREE.BufferGeometry {
    const d = data as any;
    const w = d.width ?? 200;
    const h = d.height ?? 200;

    switch (type) {
      case 'sphere': {
        const r = d.radiusX ?? d.radius ?? 100;
        return new THREE.SphereGeometry(r, 32, 24);
      }
      case 'cube': {
        const depth = d.depth ?? d.width ?? 200;
        return new THREE.BoxGeometry(w, h, depth);
      }
      case 'cylinder': {
        const r = d.radiusX ?? d.radius ?? 100;
        const height = d.height ?? 200;
        const segments = d.sides ?? 32;
        return new THREE.CylinderGeometry(r, r, height, segments);
      }
      case 'cone': {
        const r = d.radiusX ?? d.radius ?? 100;
        const height = d.height ?? 200;
        return new THREE.ConeGeometry(r, height, 32);
      }
      case 'torus': {
        const R = d.radiusX ?? d.radius ?? 100;
        const tube = d.tube ?? R * 0.3;
        return new THREE.TorusGeometry(R, tube, 24, 48);
      }
      default:
        return new THREE.PlaneGeometry(w, h);
    }
  }

  updateData(data: ShapeData): void {
    const key = JSON.stringify(data);
    if (key === this._cacheKey) return;
    this._data = data;
    this._cacheKey = key;

    const presetId = (data as any).presetId ?? (data as any).type;
    const is3D = SHAPES_3D.has(presetId);

    if (is3D) {
      const newGeo = ShapeLayerRenderer._create3DGeometry(presetId, data);
      const oldGeo = this.geometry;
      this.mesh.geometry = newGeo;
      (this as any).geometry = newGeo;
      oldGeo.dispose();
      this._is3D = true;
      this._apply3DMaterial();
      this._update3DDimensions(presetId, data);
    } else if (this._is3D) {
      const newGeo = new THREE.PlaneGeometry(200, 200);
      const oldGeo = this.geometry;
      this.mesh.geometry = newGeo;
      (this as any).geometry = newGeo;
      oldGeo.dispose();

      if (!(this.mesh.material instanceof THREE.MeshBasicMaterial)) {
        const oldMat = this.mesh.material as THREE.Material;
        this.mesh.material = new THREE.MeshBasicMaterial({
          map: this._tex,
          depthTest: false,
          transparent: true,
          premultipliedAlpha: false,
          side: THREE.DoubleSide,
          blending: THREE.CustomBlending,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
          blendSrcAlpha: THREE.OneFactor,
          blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
          blendEquation: THREE.AddEquation,
          alphaTest: 0.001,
        });
        oldMat.dispose();
      }
      this._is3D = false;
      this._render();
    } else {
      this._render();
    }
  }

  private _apply3DMaterial(): void {
    const fill = (this._data as any).fill as ShapeFill | undefined;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    if (fill) {
      const color = fill.color ?? '#ffffff';
      mat.color.set(color);
      mat.opacity = (fill.opacity ?? 100) / 100;
      mat.transparent = mat.opacity < 1;
    }
    mat.needsUpdate = true;
  }

  private _update3DDimensions(type: string, data: ShapeData): void {
    const d = data as any;
    switch (type) {
      case 'sphere': this._w = this._h = (d.radiusX ?? d.radius ?? 100) * 2; break;
      case 'cube': this._w = d.width ?? 200; this._h = d.height ?? 200; break;
      case 'cylinder':
      case 'cone': this._w = (d.radiusX ?? d.radius ?? 100) * 2; this._h = d.height ?? 200; break;
      case 'torus': this._w = this._h = (d.radiusX ?? d.radius ?? 100) * 2; break;
      default: this._w = this._h = 200;
    }
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
    if (this._is3D) return;
    const data = this._data;
    const stroke = (data as any).stroke as ShapeStroke | undefined;
    const strokeW = stroke?.enabled ? (stroke.width ?? 0) : 0;
    const pad = strokeW > 0 ? Math.ceil(strokeW / 2) + 2 : 0;
    const { w, h } = this._dims();
    const logW = w + pad * 2;
    const logH = h + pad * 2;
    const cw = Math.min(MAX_TEX, Math.ceil(logW * DPI));
    const ch = Math.min(MAX_TEX, Math.ceil(logH * DPI));

    if (this._canvas.width !== cw || this._canvas.height !== ch) {
      this._canvas.width = cw; this._canvas.height = ch;
    }

    const ctx = this._ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Nuke to fully transparent
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.scale(DPI, DPI);

    const cx = logW / 2, cy = logH / 2;
    const path2d = this._buildPath2D(cx, cy, w, h);
    if (!path2d) { this._finalize(logW, logH); return; }

    const fill = (data as any).fill as ShapeFill | undefined;
    if (fill && fill.opacity > 0) {
      ctx.save();
      ctx.globalAlpha = fill.opacity / 100;
      ctx.fillStyle = this._makeFillStyle(fill, cx, cy, w, h);
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
    if (data.type === 'rectangle') {
      const p = new Path2D();
      const r = Math.min(data.borderRadius ?? 0, w / 2, h / 2);
      if (r > 0 && (p as any).roundRect) (p as any).roundRect(cx - w / 2, cy - h / 2, w, h, r);
      else p.rect(cx - w / 2, cy - h / 2, w, h);
      return p;
    }
    if (data.type === 'ellipse') {
      const p = new Path2D();
      p.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      return p;
    }
    const p = new Path2D();
    p.rect(cx - w / 2, cy - h / 2, w, h);
    return p;
  }

  private _presetId(): string { const d = this._data as any; return d.presetId ?? d.type; }
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
      if (cmd === 'M') p.moveTo(cx + n(), cy + n());
      else if (cmd === 'L') p.lineTo(cx + n(), cy + n());
      else if (cmd === 'C') { const x1 = n(), y1 = n(), x2 = n(), y2 = n(), x = n(), y = n(); p.bezierCurveTo(cx + x1, cy + y1, cx + x2, cy + y2, cx + x, cy + y); }
      else if (cmd === 'Q') { const qx = n(), qy = n(), x = n(), y = n(); p.quadraticCurveTo(cx + qx, cy + qy, cx + x, cy + y); }
      else if (cmd === 'Z' || cmd === 'z') p.closePath();
    }
    return p;
  }

  private _cmdsToPath2D(commands: PathCommand[], offX: number, offY: number): Path2D {
    const p = new Path2D();
    for (const cmd of commands) {
      const pts = cmd.points;
      if (cmd.type === 'M') p.moveTo(pts[0] + offX, pts[1] + offY);
      else if (cmd.type === 'L') p.lineTo(pts[0] + offX, pts[1] + offY);
      else if (cmd.type === 'C') p.bezierCurveTo(pts[0] + offX, pts[1] + offY, pts[2] + offX, pts[3] + offY, pts[4] + offX, pts[5] + offY);
      else if (cmd.type === 'Q') p.quadraticCurveTo(pts[0] + offX, pts[1] + offY, pts[2] + offX, pts[3] + offY);
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
      const dx = Math.cos(rad) * w / 2, dy = Math.sin(rad) * h / 2;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    if (g.type === 'radial-gradient') {
      const rx = (g.centerX ?? 0.5) * w + (cx - w / 2);
      const ry = (g.centerY ?? 0.5) * h + (cy - h / 2);
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, (g.radius ?? 0.5) * Math.max(w, h));
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
    for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
    return grad;
  }

  setFillColor(color: string): void {
    if (this._is3D) {
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(color);
      mat.needsUpdate = true;
    } else {
      (this._data as any).fill = { ...((this._data as any).fill ?? { type: 'solid', opacity: 100 }), color, type: 'solid' };
      this._cacheKey = ''; this._render();
    }
  }
  setFill(fill: ShapeFill): void {
    if (this._is3D) this._apply3DMaterial();
    else { (this._data as any).fill = fill; this._cacheKey = ''; this._render(); }
  }
  setSize(w: number, h: number): void {
    if (this._data.type === 'rectangle') { (this._data as any).width = w; (this._data as any).height = h; }
    else if (this._data.type === 'ellipse') { (this._data as any).radiusX = w / 2; (this._data as any).radiusY = h / 2; }
    if (this._is3D) {
      const presetId = (this._data as any).presetId ?? (this._data as any).type;
      const newGeo = ShapeLayerRenderer._create3DGeometry(presetId, this._data);
      const oldGeo = this.geometry;
      this.mesh.geometry = newGeo;
      (this as any).geometry = newGeo;
      oldGeo.dispose();
      this._update3DDimensions(presetId, this._data);
    }
    this._cacheKey = '';
    if (!this._is3D) this._render();
  }
  setFillOpacity(o: number): void {
    const d = this._data as any;
    d.fill = { ...(d.fill ?? { type: 'solid', color: '#fff' }), opacity: o * 100 };
    if (this._is3D) this._apply3DMaterial();
    else { this._cacheKey = ''; this._render(); }
  }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }
}