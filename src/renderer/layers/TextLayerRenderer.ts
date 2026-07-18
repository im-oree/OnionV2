import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { TextData } from '../../types/layer';

const DPI_SCALE = 2;
const PAD = 16;
const MAX_SIZE = 4096;

export class TextLayerRenderer extends BaseLayerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textData: TextData;
  private cacheKey = '';
  private canvasTexture: THREE.CanvasTexture;
  private _textWidth = 100;
  private _textHeight = 40;

  constructor(id: string, data: TextData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.premultiplyAlpha = true;
    texture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(100, 40);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
      premultipliedAlpha: true,
    });

    super(id, geo, mat);
    this.canvas = canvas;
    this.ctx = ctx;
    this.textData = data;
    this.canvasTexture = texture;
    this.renderText();
  }

  setText(data: TextData): void {
    const key = this.buildCacheKey(data);
    if (key === this.cacheKey) return;
    this.textData = data;
    this.cacheKey = key;
    this.renderText();
  }

  private renderText(): void {
    const d = this.textData;
    const ctx = this.ctx;
    const text = d.text ?? '';
    const fontSize = Math.max(1, d.fontSize);
    const font = `${d.fontWeight} ${fontSize}px "${d.fontFamily}", system-ui, sans-serif`;

    ctx.font = font;
    const lines = text.length === 0 ? [' '] : text.split('\n');
    let maxWidth = 0;
    for (const line of lines) {
      const m = ctx.measureText(line);
      if (m.width > maxWidth) maxWidth = m.width;
    }

    const lineHeight = fontSize * (d.lineHeight || 1.2);
    const totalHeight = lines.length * lineHeight;

    // Logical (world) dimensions
    const logicalW = Math.max(1, Math.ceil(maxWidth + PAD * 2));
    const logicalH = Math.max(1, Math.ceil(totalHeight + PAD * 2));

    // Backing store (DPI-scaled)
    const cw = Math.min(MAX_SIZE, Math.ceil(logicalW * DPI_SCALE));
    const ch = Math.min(MAX_SIZE, Math.ceil(logicalH * DPI_SCALE));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.scale(DPI_SCALE, DPI_SCALE);

    ctx.font = font;
    ctx.fillStyle = d.color || '#ffffff';
    ctx.textBaseline = 'top';
    ctx.textAlign = d.alignment === 'center' ? 'center' : d.alignment === 'right' ? 'right' : 'left';

    const alignX = d.alignment === 'center'
      ? logicalW / 2
      : d.alignment === 'right' ? logicalW - PAD : PAD;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], alignX, PAD + i * lineHeight);
    }

    // Rebuild geometry at logical dimensions (Y-up world)
    const oldGeo = this.geometry;
    const newGeo = new THREE.PlaneGeometry(logicalW, logicalH);
    this.mesh.geometry = newGeo;
    this.geometry = newGeo;
    oldGeo.dispose();

    this.canvasTexture.needsUpdate = true;
    (this.material as THREE.MeshBasicMaterial).needsUpdate = true;

    this._textWidth = logicalW;
    this._textHeight = logicalH;
  }

  private buildCacheKey(d: TextData): string {
    return `${d.text}|${d.fontFamily}|${d.fontSize}|${d.fontWeight}|${d.color}|${d.alignment}|${d.letterSpacing}|${d.lineHeight}`;
  }

  protected geometryWidth(): number { return this._textWidth; }
  protected geometryHeight(): number { return this._textHeight; }
}