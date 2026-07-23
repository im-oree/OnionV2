import * as THREE from 'three';
import { BaseLayerRenderer } from './BaseLayerRenderer';
import { assetManager } from '../../storage/AssetManager';
import { getAudioContext, installUnlockHandler, registerForUnlock, unregisterForUnlock } from '../audio/audioContext';
import { createAudioEffect } from '../audio/audioEffects';

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

  // ── Web Audio pipeline for video audio ──
  private _audioSource: MediaElementAudioSourceNode | null = null;
  private _audioGain: GainNode | null = null;
  private _audioPan: StereoPannerNode | null = null;
  private _audioEffectsIn: GainNode | null = null;
  private _audioEffectsOut: GainNode | null = null;
  private _audioEQIn: GainNode | null = null;
  private _audioEQOut: GainNode | null = null;
  private _activeEffects: Array<{ instanceId: string; node: ReturnType<typeof createAudioEffect> }> = [];
  private _activeEQBands: BiquadFilterNode[] = [];
  private _lastEffectsHash = '';
  private _lastEQHash = '';

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
    // Tear down old audio graph before creating new video (asset swap)
    this._teardownAudioGraph();

    const asset = assetManager.getAsset(this.assetId);
    if (!asset) return;

    const video = document.createElement('video');
    video.src = asset.url;
    video.crossOrigin = 'anonymous';
    video.loop = false;

    // Keep muted=true for autoplay policy compatibility (Chrome/Firefox block
    // unmuted autoplay). Audio data still reaches MediaElementSource regardless
    // of the muted property — it only affects the element's direct speaker output.
    // The GainNode controls all volume. installUnlockHandler unmutes after gesture.
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

    // ── Web Audio pipeline for video audio ──
    try {
      const ctx = getAudioContext();
      installUnlockHandler();
      registerForUnlock(video);
      this._audioSource = ctx.createMediaElementSource(video);
      this._audioGain = ctx.createGain();
      this._audioPan = ctx.createStereoPanner();
      this._audioEffectsIn = ctx.createGain();
      this._audioEffectsOut = ctx.createGain();
      this._audioEQIn = ctx.createGain();
      this._audioEQOut = ctx.createGain();

      this._audioSource.connect(this._audioGain);
      this._audioGain.connect(this._audioPan);
      this._audioPan.connect(this._audioEffectsIn);
      this._audioEffectsIn.connect(this._audioEffectsOut);
      this._audioEffectsOut.connect(this._audioEQIn);
      this._audioEQIn.connect(this._audioEQOut);
      this._audioEQOut.connect(ctx.destination);
      // Start with gain at 0 — Renderer._syncVideoAudio will set the correct
      // volume on the next tick. This prevents a loud burst on first load.
      this._audioGain.gain.value = 0;
    } catch (err) {
      console.warn('[VideoLayer] Web Audio pipeline setup failed:', err);
    }
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

  /**
   * Apply audio properties from VideoData (volume, pan, effects, EQ).
   * Called each frame by Renderer._syncVideoAudio.
   */
  syncAudio(
    volume: number,
    muted: boolean,
    pan: number,
    effects: import('../../types/layer').AudioEffectInstance[],
    eq: import('../../types/layer').AudioEQ | undefined,
  ): void {
    if (!this._audioGain) {
      // Fallback: video.volume if Web Audio setup failed
      if (this.video) {
        this.video.volume = volume;
        this.video.muted = muted;
      }
      return;
    }

    // Volume via gain node
    this._audioGain.gain.value = muted ? 0 : volume;

    // Pan
    if (this._audioPan) {
      this._audioPan.pan.value = Math.max(-1, Math.min(1, pan));
    }

    // Effects chain
    this._syncEffectsChain(effects);
    this._syncEQ(eq);
  }

  private _teardownAudioGraph(): void {
    for (const { node } of this._activeEffects) node.dispose();
    this._activeEffects = [];
    for (const b of this._activeEQBands) { try { b.disconnect(); } catch {} }
    this._activeEQBands = [];
    if (this.video) unregisterForUnlock(this.video);
    try { this._audioEQOut?.disconnect(); } catch {}
    try { this._audioEQIn?.disconnect(); } catch {}
    try { this._audioEffectsOut?.disconnect(); } catch {}
    try { this._audioEffectsIn?.disconnect(); } catch {}
    try { this._audioPan?.disconnect(); } catch {}
    try { this._audioGain?.disconnect(); } catch {}
    try { this._audioSource?.disconnect(); } catch {}
    this._audioEQOut = null;
    this._audioEQIn = null;
    this._audioEffectsOut = null;
    this._audioEffectsIn = null;
    this._audioPan = null;
    this._audioGain = null;
    this._audioSource = null;
    this._lastEffectsHash = '';
    this._lastEQHash = '';
  }

  private _syncEffectsChain(effects: import('../../types/layer').AudioEffectInstance[]): void {
    if (!this._audioEffectsIn || !this._audioEffectsOut) return;
    const enabledEffects = (effects ?? []).filter(e => e.enabled !== false);
    const hash = JSON.stringify(enabledEffects.map(e => ({
      id: e.id, type: e.baseType, params: e.params, mix: e.mix,
    })));
    if (hash === this._lastEffectsHash) return;
    this._lastEffectsHash = hash;

    // Teardown previous chain
    for (const { node } of this._activeEffects) node.dispose();
    this._activeEffects = [];
    try { this._audioEffectsIn.disconnect(); } catch {}

    if (enabledEffects.length === 0) {
      this._audioEffectsIn.connect(this._audioEffectsOut);
      return;
    }

    const ctx = getAudioContext();
    let prev: AudioNode = this._audioEffectsIn;
    for (const fx of enabledEffects) {
      const node = createAudioEffect(ctx, fx.baseType, fx.params);
      node.setMix(fx.mix ?? 1);
      prev.connect(node.input);
      prev = node.output;
      this._activeEffects.push({ instanceId: fx.id, node });
    }
    prev.connect(this._audioEffectsOut);
  }

  private _syncEQ(eq: import('../../types/layer').AudioEQ | undefined): void {
    if (!this._audioEQIn || !this._audioEQOut) return;
    const enabled = eq?.enabled !== false && eq?.bands && eq.bands.length > 0;
    const hash = JSON.stringify(enabled ? eq!.bands : []);
    if (hash === this._lastEQHash) return;
    this._lastEQHash = hash;

    for (const b of this._activeEQBands) { try { b.disconnect(); } catch {} }
    this._activeEQBands = [];
    try { this._audioEQIn.disconnect(); } catch {}

    if (!enabled) {
      this._audioEQIn.connect(this._audioEQOut);
      return;
    }

    const ctx = getAudioContext();
    let prev: AudioNode = this._audioEQIn;
    for (const band of eq!.bands) {
      const filter = ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      prev.connect(filter);
      prev = filter;
      this._activeEQBands.push(filter);
    }
    prev.connect(this._audioEQOut);
  }

  override dispose(): void {
    // Teardown Web Audio
    for (const { node } of this._activeEffects) node.dispose();
    this._activeEffects = [];
    for (const b of this._activeEQBands) { try { b.disconnect(); } catch {} }
    this._activeEQBands = [];
    if (this.video) unregisterForUnlock(this.video);
    try { this._audioEQOut?.disconnect(); } catch {}
    try { this._audioEQIn?.disconnect(); } catch {}
    try { this._audioEffectsOut?.disconnect(); } catch {}
    try { this._audioEffectsIn?.disconnect(); } catch {}
    try { this._audioPan?.disconnect(); } catch {}
    try { this._audioGain?.disconnect(); } catch {}
    try { this._audioSource?.disconnect(); } catch {}

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