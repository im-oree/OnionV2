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
    // Guard: never create a zero-size plane. Fall back to 100×100 until the
    // real texture arrives and we can resize.
    const initW = naturalW > 0 ? naturalW : 100;
    const initH = naturalH > 0 ? naturalH : 100;
    const geo = new THREE.PlaneGeometry(initW, initH);

    // transparent MUST be true so PNG alpha renders correctly. Also, this
    // prevents a flash of opaque color before the texture arrives.
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 1,
    });
    super(id, geo, mat);
    this.assetId = assetId;
    this.naturalW = initW;
    this.naturalH = initH;
    // Only show the loading indicator if the texture isn't already cached
    // (avoids a one-frame spinner flash on already-loaded images).
    if (!textureCache.has(assetId)) {
      this._dispatchLoadingEvent(true);
    }
    this.loadTexture();
  }

  private _dispatchLoadingEvent(starting: boolean): void {
    try {
      document.dispatchEvent(new CustomEvent('layer:texture-loading', {
        detail: { layerId: this.id, loading: starting },
      }));
    } catch { /* ignore */ }
  }

  private async loadTexture(): Promise<void> {
    const asset = assetManager.getAsset(this.assetId);
    if (!asset || !asset.url) {
      console.warn(`[ImageLayer] Asset not found or has no URL: ${this.assetId}`);
      this._dispatchLoadingEvent(false);
      return;
    }

    try {
      const texture = await textureCache.loadImage(this.assetId, asset.url);
      if (!texture) {
        console.warn(`[ImageLayer] textureCache returned null for ${this.assetId}`);
        this._dispatchLoadingEvent(false);
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const mat = this.material as THREE.MeshBasicMaterial;
      mat.map = texture;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      this._loaded = true;

      // If the geometry was created with fallback dimensions (100x100) but
      // the actual image is different, resize the geometry now that we know
      // the true image size.
      const img: any = texture.image;
      const trueW = img?.naturalWidth ?? img?.width ?? 0;
      const trueH = img?.naturalHeight ?? img?.height ?? 0;
      if (
        trueW > 0 && trueH > 0 &&
        (Math.abs(trueW - this.naturalW) > 0.5 || Math.abs(trueH - this.naturalH) > 0.5)
      ) {
        this.naturalW = trueW;
        this.naturalH = trueH;
        this.geometry.dispose();
        this.geometry = new THREE.PlaneGeometry(trueW, trueH);
        this.mesh.geometry = this.geometry;
      }

      // CRITICAL: kick the render loop so the texture actually reaches the
      // screen. Without this, if the RAF loop went idle before the async
      // load resolved, the frame is never redrawn.
      try {
        const r = (window as any).__renderer;
        r?.renderLoop?.requestRender?.();
      } catch { /* ignore */ }
    } catch (err) {
      console.warn(`[ImageLayer] Failed to load asset ${this.assetId}:`, err);
    } finally {
      this._dispatchLoadingEvent(false);
    }
  }

  reload(assetId: string): void {
    const old = this.assetId;
    this.assetId = assetId;
    textureCache.decRef(old);
    this._loaded = false;
    this._dispatchLoadingEvent(true);
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