import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { TextData } from '../../types/layer';

export class TextLayerRenderer extends BaseLayerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textData: TextData;
  private cacheKey = '';
  private _textWidth = 200;
  private _textHeight = 100;
  private canvasTexture: THREE.CanvasTexture;
  private static MAX_SIZE = 4096;

  constructor(id: string, data: TextData) {
    const w = Math.min(TextLayerRenderer.MAX_SIZE, 1024);
    const h = Math.min(TextLayerRenderer.MAX_SIZE, 256);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });

    super(id, geo, mat);
    this.canvas = canvas;
    this.ctx = ctx;
    this.textData = data;
    this.canvasTexture = texture;
    this.renderText();
  }

  setText(data: TextData): void {
    const newKey = this.buildCacheKey(data);
    if (newKey === this.cacheKey) return;
    this.textData = data;
    this.cacheKey = newKey;
    this.renderText();
  }

  private renderText(): void {
    const d = this.textData;
    const ctx = this.ctx;
    const font = `${d.fontWeight} ${d.fontSize}px "${d.fontFamily}"`;

    ctx.font = font;
    const lines = d.text.split('\n');
    let maxWidth = 0;
    for (const line of lines) {
      const m = ctx.measureText(line);
      if (m.width > maxWidth) maxWidth = m.width;
    }
    const lineHeight = d.fontSize * (d.lineHeight || 1.2);
    const totalHeight = lines.length * lineHeight;

    const pad = 20;
    const cw = Math.min(TextLayerRenderer.MAX_SIZE, Math.ceil(maxWidth + pad * 2));
    const ch = Math.min(TextLayerRenderer.MAX_SIZE, Math.ceil(totalHeight + pad * 2));
    this.canvas.width = cw;
    this.canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);
    ctx.font = font;
    ctx.fillStyle = d.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = d.alignment === 'center' ? 'center' : d.alignment === 'right' ? 'right' : 'left';

    const alignX = d.alignment === 'center' ? cw / 2 : d.alignment === 'right' ? cw - pad : pad;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], alignX, pad + i * lineHeight);
    }

    // Update geometry to match text size
    const oldGeo = this.geometry;
    const newGeo = new THREE.PlaneGeometry(cw, ch);
    this.mesh.geometry = newGeo;
    this.geometry = newGeo;
    oldGeo.dispose();

    // Update the canvas texture reference in the material
    const mat = this.material as THREE.MeshBasicMaterial;
    mat.map = this.canvasTexture;
    this.canvasTexture.needsUpdate = true;

    this._textWidth = cw;
    this._textHeight = ch;
  }

  private buildCacheKey(data: TextData): string {
    return `${data.text}|${data.fontFamily}|${data.fontSize}|${data.fontWeight}|${data.color}|${data.alignment}|${data.letterSpacing}|${data.lineHeight}`;
  }

  protected geometryWidth(): number { return this._textWidth; }
  protected geometryHeight(): number { return this._textHeight; }
}
