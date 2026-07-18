import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import { textureCache } from '../textures/TextureCache';
import { assetManager } from '../../storage/AssetManager';

export class ImageLayerRenderer extends BaseLayerRenderer {
  private naturalW: number;
  private naturalH: number;
  private assetId: string;
  private _loaded = false;

  constructor(id: string, assetId: string, naturalW: number, naturalH: number) {
    const geo = new THREE.PlaneGeometry(naturalW, naturalH);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      depthTest: false,
      transparent: false,
    });
    super(id, geo, mat);
    this.assetId = assetId;
    this.naturalW = naturalW;
    this.naturalH = naturalH;
    this.loadTexture();
  }

  private async loadTexture(): Promise<void> {
    const asset = assetManager.getAsset(this.assetId);
    if (!asset) return;

    try {
      const texture = await textureCache.loadImage(this.assetId, asset.url);
      (this.material as THREE.MeshBasicMaterial).map = texture;
      (this.material as THREE.MeshBasicMaterial).color.set(0xffffff);
      this.material.needsUpdate = true;
      this._loaded = true;
    } catch {
      console.warn(`[ImageLayer] Failed to load asset ${this.assetId}`);
    }
  }

  reload(assetId: string): void {
    const old = this.assetId;
    this.assetId = assetId;
    textureCache.decRef(old);
    this.loadTexture();
  }

  protected geometryWidth(): number { return this.naturalW; }
  protected geometryHeight(): number { return this.naturalH; }

  get loaded(): boolean { return this._loaded; }

  dispose(): void {
    textureCache.decRef(this.assetId);
    super.dispose();
  }
}
