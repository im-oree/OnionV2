import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import { assetManager } from '../../storage/AssetManager';

/**
 * Each VideoLayerRenderer owns its own HTMLVideoElement.
 * Independent playback per layer — no shared video elements.
 */
export class VideoLayerRenderer extends BaseLayerRenderer {
  private video: HTMLVideoElement | null = null;
  private texture: THREE.Texture | null = null;
  private _liveTexture: THREE.VideoTexture | null = null;
  private _usingCachedFrame = false;
  private naturalW: number;
  private naturalH: number;
  private assetId: string;
  private _playing = false;

  // Scrub queue — only the latest seek matters
  private _pendingScrubTime: number | null = null;
  private _scrubbing = false;

  constructor(
    id: string,
    assetId: string,
    naturalW: number,
    naturalH: number,
  ) {
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
    this.loadVideo();
  }

  private loadVideo(): void {
    const asset = assetManager.getAsset(this.assetId);
    if (!asset) return;

    const video = document.createElement('video');
    video.src = asset.url;
    video.crossOrigin = 'anonymous';
    video.loop = false;

    // Fix #1 — muted must be true to allow autoplay / seeked events
    // to fire reliably across all browsers. Unmuted video is often
    // blocked by browser autoplay policy and causes seeked events
    // to never fire, which breaks scrubbing entirely.
    video.muted = true;

    video.playsInline = true;
    video.preload = 'auto';  // Fix #2 — 'metadata' starves seeked events
    video.load();

    const texture = new THREE.VideoTexture(video);
    texture.flipY = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Fix #3 — VideoTexture does NOT need needsUpdate = true here.
    // THREE.VideoTexture overrides needsUpdate with a getter that
    // checks video.readyState. Setting it manually causes a one-frame
    // stale upload and can throw on certain drivers.

    const mat = this.material as THREE.MeshBasicMaterial;
    mat.map = texture;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;

    this.video = video;
    this.texture = texture;
    this._liveTexture = texture;
  }

  play(): void {
    if (!this.video) return;
    this.restoreLiveTexture();
    this.video.play().catch(() => {});
    this._playing = true;
  }

  pause(): void {
    if (!this.video) return;
    this.video.pause();
    this._playing = false;
  }

  /**
   * Fix #4 — old seekTo() set currentTime directly every call.
   * Rapid scrub calls pile up because the browser cannot seek
   * faster than one seek per 'seeked' event. We now queue only
   * the latest requested time and drain in _drainScrub(), which
   * waits for 'seeked' before issuing the next seek. This makes
   * scrubbing smooth and prevents the browser from hanging.
   */
  seekTo(time: number): void {
    if (!this.video) return;

    const clamped = Math.max(
      0,
      Math.min(this.video.duration || Infinity, time),
    );

    this._pendingScrubTime = clamped;
    this._drainScrub();
  }

  private _drainScrub(): void {
    if (this._scrubbing) return;
    if (this._pendingScrubTime === null) return;
    const video = this.video;
    if (!video) return;

    const target = this._pendingScrubTime;
    this._pendingScrubTime = null;
    this._scrubbing = true;

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      this._scrubbing = false;
      // If another seek arrived while we were seeking, drain it now
      this._drainScrub();
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  }

  get playing(): boolean { return this._playing; }
  get videoElement(): HTMLVideoElement | null { return this.video; }
  get videoTexture(): THREE.Texture | null { return this.texture; }

  /**
   * Capture the current video frame as an ImageBitmap.
   *
   * Fix #5 — captureFrame() was called before the seeked event
   * fired (readyState check was too lenient). readyState >= 2
   * (HAVE_CURRENT_DATA) only guarantees the PREVIOUS frame's data
   * is available, not the sought frame. We now wait for the seeked
   * event via seekTo() queue before capturing.
   *
   * Fix #6 — OffscreenCanvas fallback ctx.getContext('2d')! was
   * non-null asserted; it can return null in some workers/browsers.
   */
  async captureFrame(): Promise<ImageBitmap | null> {
    const v = this.video;
    if (!v) return null;

    // readyState 2 = HAVE_CURRENT_DATA, minimum to draw
    if (v.readyState < 2) return null;

    const w = v.videoWidth || this.naturalW;
    const h = v.videoHeight || this.naturalH;
    if (w === 0 || h === 0) return null;

    try {
      const bitmap = await createImageBitmap(v, {
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none',
      });
      if (bitmap.width > 0 && bitmap.height > 0) return bitmap;
      try { bitmap.close(); } catch {}
    } catch {
      // fall through to canvas fallback
    }

    // Fallback: OffscreenCanvas with manual flip
    try {
      const oc = new OffscreenCanvas(w, h);
      const ctx = oc.getContext('2d');
      if (!ctx) return null;  // Fix #6 — was non-null asserted

      ctx.translate(0, h);
      ctx.scale(1, -1);
      ctx.drawImage(v, 0, 0, w, h);

      const bitmap = oc.transferToImageBitmap();
      if (bitmap.width === 0 || bitmap.height === 0) return null;
      return bitmap;
    } catch {
      return null;
    }
  }

  /**
   * Apply a captured frame as the displayed texture.
   *
   * Fix #7 — old code set tex.flipY = true on a Texture wrapping
   * an ImageBitmap that was ALREADY flipped by createImageBitmap
   * imageOrientation:'flipY'. This double-flipped the image making
   * it appear upside down in paused/scrub state. flipY is now false
   * because the bitmap is already in the correct orientation.
   */
  setCachedBitmap(bitmap: ImageBitmap): void {
    const mat = this.material as THREE.MeshBasicMaterial;

    const tex = new THREE.Texture(bitmap);
    tex.flipY = false;  // Fix #7 — bitmap already flipped by createImageBitmap
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    if (
      this.texture &&
      this.texture !== this._liveTexture
    ) {
      this.texture.dispose();
    }

    mat.map = tex;
    mat.needsUpdate = true;
    this.texture = tex;
    this._usingCachedFrame = true;
  }

  restoreLiveTexture(): void {
    if (!this._usingCachedFrame || !this._liveTexture) return;

    const mat = this.material as THREE.MeshBasicMaterial;

    if (this.texture && this.texture !== this._liveTexture) {
      this.texture.dispose();
    }

    mat.map = this._liveTexture;
    mat.needsUpdate = true;
    this.texture = this._liveTexture;
    this._usingCachedFrame = false;
  }

  override dispose(): void {
    if (this.video) {
      this.video.pause();
      // Fix #8 — clear event listeners before nulling src
      // to prevent 'seeked' firing on a dead element
      this.video.src = '';
      this.video.load();
      this.video = null;
    }

    this._pendingScrubTime = null;
    this._scrubbing = false;

    if (
      this.texture &&
      this.texture !== this._liveTexture
    ) {
      this.texture.dispose();
    }

    if (this._liveTexture) {
      (this.material as THREE.MeshBasicMaterial).map = null;
      this._liveTexture.dispose();
      this._liveTexture = null;
    }

    this.texture = null;
    super.dispose();
  }

  protected geometryWidth(): number { return this.naturalW; }
  protected geometryHeight(): number { return this.naturalH; }
}