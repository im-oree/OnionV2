import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { TextData, AnimatorRangeShape } from '../../types/layer';

const DPI = 2;
const PAD = 24;
const MAX_TEX = 4096;

interface CharInfo { char:string; x:number; y:number; w:number; h:number; lineIdx:number; wordIdx:number; charIdx:number; }

export class TextLayerRenderer extends BaseLayerRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _tex: THREE.CanvasTexture;
  private _data: TextData;
  private _cacheKey = '';
  private _w = 200;
  private _h = 60;

  constructor(id: string, data: TextData) {
    // Measure text FIRST to determine canvas size
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d')!;
    const font = buildFont(data);
    measureCtx.font = font;

    const text = displayText(data);
    const lines = text.length === 0 ? [' '] : text.split('\n');
    let maxW = 0;
    for (const line of lines) {
      const m = measureCtx.measureText(line);
      if (m.width > maxW) maxW = m.width;
    }
    const lineH = Math.max(1, data.fontSize) * (data.lineHeight || 1.2);
    const totalHeight = lines.length * lineH;
    const pad = (data.padding ?? 8) + PAD;

    const logW = Math.max(1, Math.ceil(maxW + pad * 2));
    const logH = Math.max(1, Math.ceil(totalHeight + pad * 2));
    const cw = Math.min(MAX_TEX, Math.ceil(logW * DPI));
    const ch = Math.min(MAX_TEX, Math.ceil(logH * DPI));

    // Create canvas at correct size — must have alpha for transparent background
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    // Ensure transparent background
    ctx.clearRect(0, 0, cw, ch);

    // Create texture from canvas
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.premultiplyAlpha = false;
    tex.colorSpace = THREE.SRGBColorSpace;

    // Create geometry at correct proportions (NOT swapped later)
    const geo = new THREE.PlaneGeometry(logW, logH);

    // Material — straight alpha from canvas (not premultiplied)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      depthTest: false,
      transparent: true,
      premultipliedAlpha: false,
      side: THREE.DoubleSide,
    });

    super(id, geo, mat);
    this._canvas = canvas;
    this._ctx = ctx;
    this._tex = tex;
    this._data = data;
    this._w = logW;
    this._h = logH;
    this._render();

    // Ensure font loads, then re-render
    ensureFontLoaded(data.fontFamily, data.fontWeight, data.fontSize).then(() => {
      this._render();
    });
  }

  setText(data: TextData): void {
    const key = this._key(data);
    if (key === this._cacheKey) return;
    this._data = data;
    this._cacheKey = key;

    // Remeasure to see if canvas needs resizing
    const font = buildFont(data);
    this._ctx.font = font;
    const text = displayText(data);
    const lines = text.length === 0 ? [' '] : text.split('\n');
    let maxW = 0;
    for (const line of lines) {
      const m = this._ctx.measureText(line);
      if (m.width > maxW) maxW = m.width;
    }
    const lineH = Math.max(1, data.fontSize) * (data.lineHeight || 1.2);
    const totalHeight = lines.length * lineH;
    const pad = (data.padding ?? 8) + PAD;
    const logW = Math.max(1, Math.ceil(maxW + pad * 2));
    const logH = Math.max(1, Math.ceil(totalHeight + pad * 2));
    const cw = Math.min(MAX_TEX, Math.ceil(logW * DPI));
    const ch = Math.min(MAX_TEX, Math.ceil(logH * DPI));

    // Only resize if dimensions actually changed
    if (this._canvas.width !== cw || this._canvas.height !== ch) {
      this._canvas.width = cw;
      this._canvas.height = ch;

      // Rebuild geometry
      const oldGeo = this.geometry;
      const newGeo = new THREE.PlaneGeometry(logW, logH);
      this.mesh.geometry = newGeo;
      (this as any).geometry = newGeo;
      oldGeo.dispose();

      // Texture needs regeneration since canvas was resized
      this._tex.dispose();
      const newTex = new THREE.CanvasTexture(this._canvas);
      newTex.minFilter = THREE.LinearFilter;
      newTex.magFilter = THREE.LinearFilter;
      newTex.generateMipmaps = false;
      newTex.premultiplyAlpha = false;
      newTex.colorSpace = THREE.SRGBColorSpace;
      (this.material as THREE.MeshBasicMaterial).map = newTex;
      this._tex = newTex;

      this._w = logW;
      this._h = logH;
    }

    this._render();

    // Re-render after font loads if needed
    ensureFontLoaded(data.fontFamily, data.fontWeight, data.fontSize).then(() => {
      this._render();
    });
  }

  private _key(d: TextData): string {
    return JSON.stringify({
      t:d.text, ff:d.fontFamily, fs:d.fontSize, fw:d.fontWeight, fi:d.fontStyle,
      c:d.color, lh:d.lineHeight, ls:d.letterSpacing, al:d.alignment,
      sh:d.shadow, st:d.stroke, ac:d.allCaps, u:d.underline, s:d.strikethrough,
      an:d.animators, bs:d.baselineShift, ft:d.fillType, fg:d.fillGradient,
    });
  }

  private _render(): void {
    const d = this._data;
    const ctx = this._ctx;
    const font = buildFont(d);
    const text = displayText(d);
    const lines = text.length === 0 ? [' '] : text.split('\n');
    const fontSize = Math.max(1, d.fontSize);
    const lineH = fontSize * (d.lineHeight ?? 1.2);
    const spacing = d.letterSpacing ?? 0;
    const pad = (d.padding ?? 8) + PAD;

    ctx.font = font;
    let maxW = 0;
    for (const line of lines) {
      let lw = 0;
      for (const ch of line) lw += ctx.measureText(ch).width + spacing;
      lw -= spacing;
      if (lw > maxW) maxW = lw;
    }

    const logW = Math.max(1, Math.ceil(maxW + pad * 2));
    const logH = Math.max(1, Math.ceil(lines.length * lineH + pad * 2));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    // CRITICAL: set globalAlpha to 1 and fill background transparent
    ctx.globalAlpha = 1;
    ctx.scale(DPI, DPI);
    ctx.font = font;

    const chars = this._layout(d, lines, lineH, logW, spacing, pad, fontSize);
    this._applyAnimators(chars, d);
    this._draw(chars, d, logW, logH);

    this._tex.needsUpdate = true;
  }

  private _layout(d: TextData, lines: string[], lineH: number, logW: number, spacing: number, pad: number, fontSize: number): CharInfo[] {
    const ctx = this._ctx;
    ctx.font = buildFont(d);
    const chars: CharInfo[] = [];
    let globalChar = 0, globalWord = 0;

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      let lineW = 0;
      for (const ch of line) lineW += ctx.measureText(ch).width + spacing;
      lineW -= spacing;

      const al = d.alignment ?? 'center';
      let startX = pad;
      if (al === 'center') startX = logW / 2 - lineW / 2;
      else if (al === 'right') startX = logW - lineW - pad;

      let x = startX;
      let localWord = 0;
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        const cw = ctx.measureText(ch).width;
        if (ch === ' ') localWord++;
        chars.push({
          char: ch, x, y: li * lineH + pad + fontSize * 0.82,
          w: cw, h: fontSize,
          lineIdx: li, wordIdx: globalWord + localWord, charIdx: globalChar++,
        });
        x += cw + spacing;
      }
      globalWord += (line.match(/ /g) || []).length + 1;
    }
    return chars;
  }

  private _applyAnimators(chars: CharInfo[], d: TextData): void {
    if (!d.animators?.length) return;
    for (const anim of d.animators) {
      if (!anim.enabled) continue;
      const maxIdx = chars.length || 1;
      const maxUnit = anim.selector === 'lines'
        ? Math.max(...chars.map(c => c.lineIdx)) + 1
        : anim.selector === 'words'
        ? Math.max(...chars.map(c => c.wordIdx)) + 1
        : maxIdx;

      for (let i = 0; i < chars.length; i++) {
        const unit = anim.selector === 'lines' ? chars[i].lineIdx
          : anim.selector === 'words' ? chars[i].wordIdx : i;
        const t = maxUnit > 1 ? unit / (maxUnit - 1) : 0;
        const w = this._weight(t, anim.rangeStart / 100, anim.rangeEnd / 100, anim.rangeShape);
        if (w === 0) continue;
        const p = anim.properties;
        if (p.positionX !== undefined) chars[i].x += p.positionX * w;
        if (p.positionY !== undefined) chars[i].y += p.positionY * w;
      }
    }
  }

  private _weight(t: number, start: number, end: number, shape: AnimatorRangeShape): number {
    if (t < start || t > end) return 0;
    const n = end > start ? (t - start) / (end - start) : 1;
    switch (shape) {
      case 'ramp up': return n;
      case 'ramp down': return 1 - n;
      case 'triangle': return n < 0.5 ? n * 2 : (1 - n) * 2;
      case 'smooth': return n * n * (3 - 2 * n);
      case 'round': return Math.sin(n * Math.PI);
      default: return 1;
    }
  }

  private _makeFillStyle(d: TextData, logW: number, logH: number): string | CanvasGradient {
    if (!d.fillGradient || (d.fillType ?? 'solid') === 'solid') return d.color ?? '#ffffff';
    const g = d.fillGradient;
    const ctx = this._ctx;
    if (g.type === 'linear-gradient') {
      const rad = (g.angle * Math.PI) / 180;
      const dx = Math.cos(rad) * logW / 2, dy = Math.sin(rad) * logH / 2;
      const grad = ctx.createLinearGradient(logW / 2 - dx, logH / 2 - dy, logW / 2 + dx, logH / 2 + dy);
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    if (g.type === 'radial-gradient') {
      const cx = (g.centerX ?? 0.5) * logW, cy = (g.centerY ?? 0.5) * logH;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, (g.radius ?? 0.5) * Math.max(logW, logH));
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
      return grad;
    }
    return d.color ?? '#ffffff';
  }

  private _draw(chars: CharInfo[], d: TextData, logW: number, logH: number): void {
    const ctx = this._ctx;
    ctx.font = buildFont(d);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    const fillStyle = this._makeFillStyle(d, logW, logH);

    // Shadow pass (drawn behind text)
    if (d.shadow?.enabled) {
      ctx.save();
      ctx.shadowColor = d.shadow.color ?? '#000';
      ctx.shadowBlur = d.shadow.blur ?? 0;
      ctx.shadowOffsetX = d.shadow.offsetX ?? 0;
      ctx.shadowOffsetY = d.shadow.offsetY ?? 0;
      ctx.fillStyle = d.color ?? '#ffffff';
      for (const c of chars) {
        if (c.char === ' ') continue;
        ctx.fillText(c.char, c.x, c.y + (d.baselineShift ?? 0));
      }
      ctx.restore();
    }

    // Main fill — this is the only pass that draws text glyphs
    ctx.fillStyle = fillStyle;
    for (const c of chars) {
      if (c.char === ' ') continue;
      ctx.fillText(c.char, c.x, c.y + (d.baselineShift ?? 0));
      if (d.underline) ctx.fillRect(c.x, c.y + (d.baselineShift ?? 0) + 2, c.w, Math.max(1, d.fontSize * 0.05));
      if (d.strikethrough) ctx.fillRect(c.x, c.y + (d.baselineShift ?? 0) - d.fontSize * 0.3, c.w, Math.max(1, d.fontSize * 0.05));
    }

    // Stroke pass — ONLY when explicitly enabled with visible width
    if (d.stroke?.enabled && (d.stroke.width ?? 0) > 0) {
      ctx.strokeStyle = d.stroke.color ?? '#000';
      ctx.lineWidth = d.stroke.width ?? 1;
      ctx.lineJoin = 'round';
      for (const c of chars) {
        if (c.char === ' ') continue;
        ctx.strokeText(c.char, c.x, c.y + (d.baselineShift ?? 0));
      }
    }
  }

  protected geometryWidth(): number { return this._w; }
  protected geometryHeight(): number { return this._h; }
}

/* ── Helpers ── */

function buildFont(d: TextData): string {
  const style = d.fontStyle && d.fontStyle !== 'normal' ? d.fontStyle : '';
  const weight = d.fontWeight ?? 400;
  const size = Math.max(1, d.fontSize);
  const family = d.fontFamily ? `"${d.fontFamily}", system-ui, sans-serif` : 'system-ui, sans-serif';
  return `${style} ${weight} ${size}px ${family}`.trim();
}

function displayText(d: TextData): string {
  let t = d.text ?? '';
  if (d.allCaps) t = t.toUpperCase();
  return t;
}

async function ensureFontLoaded(family: string, weight: number, _size: number): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.load(`${weight} 16px "${family}"`);
  } catch {
    // Font failed to load — fall back to system font
  }
}
