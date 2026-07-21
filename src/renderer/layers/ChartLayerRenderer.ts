import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { ChartData } from '../../types/dataViz';

const DPI = 2;

export class ChartLayerRenderer extends BaseLayerRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _tex: THREE.CanvasTexture;
  private _data: ChartData;

  constructor(id: string, data: ChartData) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(400, 400);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    super(id, geo, mat);
    this._canvas = canvas; this._ctx = ctx; this._tex = tex; this._data = data;
    this._render();
  }

  updateData(data: ChartData) {
    this._data = data;
    this._render();
  }

  private _render() {
    const ctx = this._ctx;
    const d = this._data;
    const cw = 512 * DPI, ch = 512 * DPI;
    if(this._canvas.width !== cw) { this._canvas.width = cw; this._canvas.height = ch; }
    
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,cw,ch);
    ctx.scale(DPI, DPI);
    ctx.translate(256, 256);

    const total = d.points.reduce((acc, p) => acc + p.value, 0);
    let currentAngle = -Math.PI / 2;

    if (d.type === 'pie' || d.type === 'donut') {
      const radius = 200;
      const innerRadius = d.type === 'donut' ? radius * d.innerRadius : 0;
      
      d.points.forEach(p => {
        const sliceAngle = (p.value / total) * Math.PI * 2 * d.progress;
        ctx.beginPath();
        ctx.fillStyle = p.color || '#fff';
        ctx.moveTo(0,0);
        ctx.arc(0, 0, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        if(innerRadius > 0) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(0,0, innerRadius, 0, Math.PI*2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        currentAngle += sliceAngle + (d.spacing * 0.01);
      });
    } else if (d.type === 'bar') {
      const width = 400;
      const barWidth = (width / d.points.length) - d.spacing;
      let x = -200;
      d.points.forEach(p => {
        const h = (p.value / total) * 400 * d.progress;
        ctx.fillStyle = p.color || '#fff';
        ctx.fillRect(x, 200 - h, barWidth, h);
        x += barWidth + d.spacing;
      });
    }
    this._tex.needsUpdate = true;
  }

  protected geometryWidth() { return 400; }
  protected geometryHeight() { return 400; }
}