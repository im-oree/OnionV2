/**
 * TextureStreamer — manages texture loading/unloading for video layers
 * and large image sequences. Preloads frames ahead of the playhead and
 * unloads frames behind. Uses requestVideoFrameCallback for video sync.
 */
import * as THREE from 'three';
import { TextureCache } from './TextureCache';

export class TextureStreamer {
  private _preloadRadius = 30; // frames ahead to preload
  private _unloadRadius = 60; // frames behind to unload
  private _videoElements = new Map<string, HTMLVideoElement>();
  private _videoTextures = new Map<string, THREE.VideoTexture>();
  private _onVideoFrameCallbacks = new Map<string, () => void>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_textureCache: TextureCache) {
    // TextureCache available for future use with decoded frames
  }

  /** Set how many frames ahead to preload */
  setPreloadRadius(frames: number): void {
    this._preloadRadius = frames;
  }

  /** Set how many frames behind to unload */
  setUnloadRadius(frames: number): void {
    this._unloadRadius = frames;
  }

  /**
   * Load or retrieve a video element and create a VideoTexture.
   * Returns an existing texture if already loaded.
   */
  loadVideo(assetId: string, src: string): THREE.VideoTexture | null {
    // Check existing
    const existing = this._videoTextures.get(assetId);
    if (existing) return existing;

    try {
      const video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.loop = false;
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      // Start loading
      video.load();

      const texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      this._videoElements.set(assetId, video);
      this._videoTextures.set(assetId, texture);

      return texture;
    } catch (err) {
      console.error('[TextureStreamer] Failed to load video:', err);
      return null;
    }
  }

  /**
   * Seek a video to a specific time and return its current frame as a static texture.
   * Used for frame-accurate seeking during scrubbing.
   */
  async seekVideoToFrame(assetId: string, time: number): Promise<THREE.Texture | null> {
    const video = this._videoElements.get(assetId);
    if (!video) return null;

    video.currentTime = time;

    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        const texture = this._videoTextures.get(assetId);
        if (texture) {
          texture.needsUpdate = true;
          resolve(texture);
        } else {
          resolve(null);
        }
      };
      video.addEventListener('seeked', onSeeked);
    });
  }

  /**
   * Register a callback fired on each video frame (via requestVideoFrameCallback).
   */
  onVideoFrame(assetId: string, callback: () => void): void {
    this._onVideoFrameCallbacks.set(assetId, callback);
    const video = this._videoElements.get(assetId);
    if (video && 'requestVideoFrameCallback' in video) {
      const frameCallback = () => {
        callback();
        (video as any).requestVideoFrameCallback(frameCallback);
      };
      (video as any).requestVideoFrameCallback(frameCallback);
    }
  }

  /** Update preload/unload based on current playhead frame */
  updatePlayhead(playheadFrame: number, fps: number): void {
    const playheadTime = playheadFrame / fps;

    for (const [assetId, video] of this._videoElements) {
      const aheadTime = playheadTime + this._preloadRadius / fps;
      const behindTime = playheadTime - this._unloadRadius / fps;

      // If video time is behind the unload radius, pause to save resources
      if (video.currentTime < behindTime && !video.paused) {
        video.pause();
      }

      // If video is within range and not playing, start playing
      if (video.currentTime >= behindTime && video.currentTime <= aheadTime && video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  /** Check if a video is loaded */
  hasVideo(assetId: string): boolean {
    return this._videoElements.has(assetId);
  }

  /** Get the VideoTexture for a loaded video */
  getVideoTexture(assetId: string): THREE.VideoTexture | null {
    return this._videoTextures.get(assetId) ?? null;
  }

  /** Get the HTMLVideoElement for a loaded video */
  getVideoElement(assetId: string): HTMLVideoElement | null {
    return this._videoElements.get(assetId) ?? null;
  }

  /** Unload a specific video asset */
  unload(assetId: string): void {
    const video = this._videoElements.get(assetId);
    if (video) {
      video.pause();
      video.src = '';
      video.load();
      this._videoElements.delete(assetId);
    }
    const texture = this._videoTextures.get(assetId);
    if (texture) {
      texture.dispose();
      this._videoTextures.delete(assetId);
    }
    this._onVideoFrameCallbacks.delete(assetId);
  }

  /** Unload all assets */
  clear(): void {
    for (const id of [...this._videoElements.keys()]) {
      this.unload(id);
    }
  }

  dispose(): void {
    this.clear();
  }
}
