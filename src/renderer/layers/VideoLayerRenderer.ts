import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import { assetManager } from '../../storage/AssetManager';

/**
 * Each VideoLayerRenderer owns its own HTMLVideoElement.
 * This is critical: duplicated video layers each need independent playback
 * (different seek positions, play/pause states). Sharing a single video
 * element via TextureCache causes stuttering when multiple layers play.
 */
export class VideoLayerRenderer extends BaseLayerRenderer {
  private video: HTMLVideoElement | null = null;
  private texture: THREE.Texture | null = null;
  private _liveTexture: THREE.Texture | null = null;
  private _usingCachedFrame = false;
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

    // Create a PRIVATE video element — never shared between layers
    const video = document.createElement('video');
    video.src = asset.url;
    video.crossOrigin = 'anonymous';
    video.loop = false;
    video.muted = false;
    video.playsInline = true;
    video.preload = 'metadata';
    video.load();

    const texture = new THREE.VideoTexture(video);
    texture.flipY = true;  // Explicit — flip for WebGL orientation
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    (this.material as THREE.MeshBasicMaterial).map = texture;
    (this.material as THREE.MeshBasicMaterial).color.set(0xffffff);
    this.material.needsUpdate = true;
    this.video = video;
    this.texture = texture;
    this._liveTexture = texture;  // Preserve original for restore
  }

  play(): void {
    if (this.video) { this.video.play().catch(() => {}); this._playing = true; }
  }

  pause(): void {
    if (this.video) { this.video.pause(); this._playing = false; }
  }

  seekTo(time: number): void {
    if (this.video) this.video.currentTime = time;
  }

  get playing(): boolean { return this._playing; }
  get videoElement(): HTMLVideoElement | null { return this.video; }
  get videoTexture(): THREE.Texture | null { return this.texture; }

  /**
   * Capture the current video frame as an ImageBitmap.
   * Uses canvas drawImage which is the most reliable cross-browser method.
   * createImageBitmap(video) is avoided — it can return black frames or fail
   * silently in some browsers, especially during seeking.
   */
    async captureFrame(): Promise<ImageBitmap | null> {
    const v = this.video;
    if (!v || v.readyState < 2) return null; // HAVE_CURRENT_DATA
    const w = v.videoWidth || this.naturalW;
    const h = v.videoHeight || this.naturalH;
    if (w === 0 || h === 0) return null;
    // Primary path: createImageBitmap(video). It respects the video's
    // native orientation and does not go through a 2D canvas (which can
    // introduce driver-dependent horizontal mirroring on some GPUs).
    try {
      const bitmap = await createImageBitmap(v, {
        imageOrientation: 'from-image',
        premultiplyAlpha: 'none',
      });
      if (bitmap.width > 0 && bitmap.height > 0) return bitmap;
      try { bitmap.close(); } catch { /* ignore */ }
    } catch {
      // Fall through to canvas fallback below.
    }
    // Fallback: draw the video into an OffscreenCanvas. Only reached when
    // createImageBitmap(video) is unsupported. This path can mirror on
    // some GPU drivers — accept it as the last resort.
    try {
      const oc = new OffscreenCanvas(w, h);
      const ctx = oc.getContext('2d')!;
      ctx.drawImage(v, 0, 0, w, h);
      const bitmap = oc.transferToImageBitmap();
      if (bitmap.width === 0 || bitmap.height === 0) return null;
      return bitmap;
    } catch {
      return null;
    }
  }

  setCachedBitmap(bitmap: ImageBitmap): void {
    if (this._usingCachedFrame) return;  // Already showing cached frame
    const mat = this.material as THREE.MeshBasicMaterial;
    // Create texture directly from ImageBitmap.
    // NOTE: ImageBitmaps from OffscreenCanvas.transferToImageBitmap() are
    // already in top-left origin (same as a normal <img>). VideoTexture
    // needs flipY:true because video frames are bottom-up, but plain
    // ImageBitmaps do NOT — flipping them causes upside-down + mirrored
    // frames (visible when scrubbing / paused).
    const tex = new THREE.Texture(bitmap);
    tex.flipY = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    if (this.texture && this.texture !== this._liveTexture) this.texture.dispose();
    mat.map = tex;
    mat.needsUpdate = true;
    this.texture = tex;
    this._usingCachedFrame = true;
  }

  /**
   * Restore the live VideoTexture for normal playback.
   * Skips if already showing the live texture.
   */
  restoreLiveTexture(): void {
    if (!this._usingCachedFrame || !this._liveTexture) return;
    const mat = this.material as THREE.MeshBasicMaterial;
    if (this.texture && this.texture !== this._liveTexture) this.texture.dispose();
    mat.map = this._liveTexture;
    mat.needsUpdate = true;
    this.texture = this._liveTexture;
    this._usingCachedFrame = false;
  }

  /** Dispose this layer's private video element and texture */
  override dispose(): void {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video = null;
    }
    if (this.texture) {
      (this.material as THREE.MeshBasicMaterial).map = null;
      this.texture.dispose();
      this.texture = null;
    }
    super.dispose();
  }

  protected geometryWidth(): number { return this.naturalW; }
  protected geometryHeight(): number { return this.naturalH; }
}
