import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import { textureCache } from '../textures/TextureCache';
import { assetManager } from '../../storage/AssetManager';

export class ImageLayerRenderer extends BaseLayerRenderer {
  private naturalW: number;
  private naturalH: number;
  private assetId: string;
  private _loaded = false;
  // Fix #1 — track disposal to prevent async texture load from applying
  // after the layer has been removed from the scene.
  private _disposed = false;
  // Fix #2 — track active load so reload() can cancel a stale in-flight load
  private _loadGeneration = 0;

  constructor(
    id: string,
    assetId: string,
    naturalW: number,
    naturalH: number,
  ) {
    const initW = naturalW > 0 ? naturalW : 100;
    const initH = naturalH > 0 ? naturalH : 100;
    const geo = new THREE.PlaneGeometry(initW, initH);

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

    if (!textureCache.has(assetId)) {
      this._dispatchLoadingEvent(true);
    }

    this.loadTexture(this._loadGeneration);
  }

  private _dispatchLoadingEvent(starting: boolean): void {
    try {
      document.dispatchEvent(
        new CustomEvent('layer:texture-loading', {
          detail: { layerId: this.id, loading: starting },
        }),
      );
    } catch {
      // ignore
    }
  }

  private async loadTexture(generation: number): Promise<void> {
    const asset = assetManager.getAsset(this.assetId);

    if (!asset?.url) {
      console.warn(
        `[ImageLayer] Asset not found or has no URL: ${this.assetId}`,
      );
      this._dispatchLoadingEvent(false);
      return;
    }

    try {
      const texture = await textureCache.loadImage(
        this.assetId,
        asset.url,
      );

      // Fix #1 — bail if disposed while awaiting
      if (this._disposed) return;

      // Fix #2 — bail if a newer reload() superseded this load
      if (generation !== this._loadGeneration) return;

      if (!texture) {
        console.warn(
          `[ImageLayer] textureCache returned null for ${this.assetId}`,
        );
        return;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const mat = this.material as THREE.MeshBasicMaterial;

      // Fix #3 — if a previous texture was set on the material and it
      // is NOT from the shared texture cache (i.e. it was a one-off),
      // dispose it. Without this, swapping textures via reload() leaks
      // the old GPU texture every time.
      if (mat.map && mat.map !== texture) {
        // Only dispose if textureCache doesn't own it
        if (!textureCache.has(this.assetId)) {
          mat.map.dispose();
        }
      }

      mat.map = texture;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      this._loaded = true;

      // Fix #4 — prefer naturalWidth/naturalHeight (HTMLImageElement) then
      // width/height (ImageBitmap / OffscreenCanvas). Old code tried them
      // in the wrong order: naturalWidth is 0 on ImageBitmap.
      const img: any = texture.image;
      const trueW: number =
        img?.width ?? img?.naturalWidth ?? 0;
      const trueH: number =
        img?.height ?? img?.naturalHeight ?? 0;

      if (
        trueW > 0 &&
        trueH > 0 &&
        (Math.abs(trueW - this.naturalW) > 0.5 ||
          Math.abs(trueH - this.naturalH) > 0.5)
      ) {
        this.naturalW = trueW;
        this.naturalH = trueH;

        // Fix #5 — dispose old geometry before replacing it to avoid a
        // GPU buffer leak. Old code called this.geometry.dispose() but
        // then assigned a new PlaneGeometry without disposing first if
        // the geometry was already the correct size.
        this.geometry.dispose();

        const newGeo = new THREE.PlaneGeometry(trueW, trueH);
        this.geometry = newGeo;
        this.mesh.geometry = newGeo;
      }

      // Fix #6 — accessing window.__renderer is a fragile global coupling.
      // Emit a custom event instead so the render loop can subscribe
      // without being directly referenced here.
      try {
        document.dispatchEvent(
          new CustomEvent('layer:texture-ready', {
            detail: { layerId: this.id },
          }),
        );
      } catch {
        // ignore
      }
    } catch (err) {
      // Fix #1 — don't warn after dispose
      if (!this._disposed) {
        console.warn(
          `[ImageLayer] Failed to load asset ${this.assetId}:`,
          err,
        );
      }
    } finally {
      // Fix #1 — only dispatch if still alive
      if (!this._disposed && generation === this._loadGeneration) {
        this._dispatchLoadingEvent(false);
      }
    }
  }

  reload(assetId: string): void {
    if (this._disposed) return;

    // Fix #7 — old code called textureCache.decRef(old) BEFORE the new
    // load completed. If the new assetId === old assetId this could evict
    // the texture that is still in use. Only decRef after we know the new
    // load is starting, and only when the id actually changes.
    const oldId = this.assetId;

    if (oldId !== assetId) {
      textureCache.decRef(oldId);
    }

    this.assetId = assetId;
    this._loaded = false;

    // Fix #2 — bump generation so the previous in-flight load is ignored
    this._loadGeneration++;

    this._dispatchLoadingEvent(true);
    this.loadTexture(this._loadGeneration);
  }

  protected geometryWidth(): number { return this.naturalW; }
  protected geometryHeight(): number { return this.naturalH; }

  get loaded(): boolean { return this._loaded; }

  override dispose(): void {
    // Fix #1 — mark disposed immediately so async load can check
    this._disposed = true;
    this._loadGeneration++;  // invalidate any in-flight load

    textureCache.decRef(this.assetId);
    super.dispose();
  }
}