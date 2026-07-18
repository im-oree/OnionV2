import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import { textureCache } from '../textures/TextureCache';
import { assetManager } from '../../storage/AssetManager';

export class VideoLayerRenderer extends BaseLayerRenderer {
  private video: HTMLVideoElement | null = null;
  private naturalW: number;
  private naturalH: number;
  private assetId: string;
  private _playing = false;

  constructor(id: string, assetId: string, naturalW: number, naturalH: number) {
    const geo = new THREE.PlaneGeometry(naturalW, naturalH);
    const mat = new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false, transparent: false });
    super(id, geo, mat);
    this.assetId = assetId;
    this.naturalW = naturalW;
    this.naturalH = naturalH;
    this.loadVideo();
  }

  private loadVideo(): void {
    const asset = assetManager.getAsset(this.assetId);
    if (!asset) return;

    const { texture, video } = textureCache.loadVideo(this.assetId, asset.url);
    (this.material as THREE.MeshBasicMaterial).map = texture;
    (this.material as THREE.MeshBasicMaterial).color.set(0xffffff);
    this.material.needsUpdate = true;
    this.video = video;
  }

  play(): void {
    if (this.video) { this.video.play(); this._playing = true; }
  }

  pause(): void {
    if (this.video) { this.video.pause(); this._playing = false; }
  }

  seekTo(time: number): void {
    if (this.video) this.video.currentTime = time;
  }

  get playing(): boolean { return this._playing; }

  protected geometryWidth(): number { return this.naturalW; }
  protected geometryHeight(): number { return this.naturalH; }
}
