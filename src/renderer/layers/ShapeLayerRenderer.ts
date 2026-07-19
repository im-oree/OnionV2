import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import type { ShapeData, ShapeFill } from '../../types/layer';
import { createGradientMaterial, updateGradientMaterial } from '../shaders/GradientShader';

export class ShapeLayerRenderer extends BaseLayerRenderer {
  private _width: number;
  private _height: number;
  private _isGradient = false;

  constructor(id: string, data: ShapeData, fillColor = '#ffffff') {
    const w = 'width' in data ? data.width : ('radiusX' in data ? data.radiusX * 2 : data.radius * 2);
    const h = 'height' in data ? data.height : ('radiusY' in data ? data.radiusY * 2 : data.radius * 2);

    const fill = (data as any).fill as ShapeFill | undefined;
    const geo = new THREE.PlaneGeometry(w, h);

    let mat: THREE.Material;
    let isGrad = false;

    if (fill && fill.type !== 'solid' && fill.gradient) {
      mat = createGradientMaterial(fill.gradient, fill.opacity / 100);
      isGrad = true;
    } else {
      const color = fill?.color ?? fillColor;
      const opacity = fill ? fill.opacity / 100 : 1;
      mat = new THREE.MeshBasicMaterial({
        color, depthTest: false,
        transparent: opacity < 1, opacity,
        side: THREE.DoubleSide,
      });
    }

    super(id, geo, mat);
    this._width = w;
    this._height = h;
    this._isGradient = isGrad;
  }

  /** Set solid fill color (replaces gradient material if needed) */
  setFillColor(color: string): void {
    if (this._isGradient) {
      this._replaceMaterial(new THREE.MeshBasicMaterial({
        color, depthTest: false, transparent: false, opacity: 1, side: THREE.DoubleSide,
      }));
      this._isGradient = false;
    } else {
      (this.material as THREE.MeshBasicMaterial).color.set(color);
    }
  }

  setFillOpacity(opacity: number): void {
    if (this._isGradient) {
      (this.material as THREE.ShaderMaterial).uniforms.uOpacity.value = opacity;
    } else {
      const mat = this.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
    }
  }

  /** Switch to gradient fill or update existing gradient */
  setGradientFill(fill: ShapeFill): void {
    if (!fill.gradient) return;
    if (!this._isGradient) {
      const newMat = createGradientMaterial(fill.gradient, fill.opacity / 100);
      this._replaceMaterial(newMat);
      this._isGradient = true;
    } else {
      updateGradientMaterial(
        this.material as THREE.ShaderMaterial,
        fill.gradient,
        fill.opacity / 100,
      );
    }
  }

  /** Full fill update — handles solid/gradient switching */
  setFill(fill: ShapeFill): void {
    if (fill.type === 'solid') {
      this.setFillColor(fill.color);
      this.setFillOpacity(fill.opacity / 100);
    } else if (fill.gradient) {
      this.setGradientFill(fill);
    }
  }

  private _replaceMaterial(newMat: THREE.Material): void {
    this.material.dispose();
    this.material = newMat;
    this.mesh.material = newMat;
  }

  setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.geometry.dispose();
    const newGeo = new THREE.PlaneGeometry(width, height);
    this.mesh.geometry = newGeo;
    (this as any).geometry = newGeo;
  }

  protected geometryWidth(): number { return this._width; }
  protected geometryHeight(): number { return this._height; }
}