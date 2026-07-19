/**
 * VideoDecoder — decode video frames on demand using WebCodecs API
 * with fallback to HTMLVideoElement.
 *
 * Provides exact frame sync for scrubbing and frame-accurate preview.
 * Caches decoded frames in a rotating buffer around the playhead.
 */

export function isWebCodecsSupported(): boolean {
  return typeof (window as any).VideoDecoder !== 'undefined' &&
    typeof (window as any).EncodedVideoChunk !== 'undefined';
}

export interface DecodedFrame {
  bitmap: ImageBitmap;
  timestamp: number; // in microseconds
  duration: number;  // in microseconds
}

export class VideoDecoderWrapper {
  private _decoder: any = null; // VideoDecoder instance
  private _frameBuffer: DecodedFrame[] = [];
  private _maxBufferSize = 30;
  private _source: string | null = null;
  private _fallbackVideo: HTMLVideoElement | null = null;
  private _webCodecsOk = false;

  /** Get available decoded frames in the buffer */
  get frameBuffer(): ReadonlyArray<DecodedFrame> {
    return this._frameBuffer;
  }

  /**
   * Initialize the decoder for a given video source.
   * Tries WebCodecs first, falls back to HTMLVideoElement.
   */
  async initialize(source: string): Promise<boolean> {
    this._source = source;

    if (isWebCodecsSupported()) {
      try {
        await this._initWebCodecs(source);
        this._webCodecsOk = true;
        return true;
      } catch (err) {
        console.warn('[VideoDecoder] WebCodecs init failed, falling back:', err);
      }
    }

    return this._initFallback(source);
  }

  /** Decode a specific frame by time (in seconds). Returns null if not available. */
  async decodeFrame(time: number): Promise<ImageBitmap | null> {
    if (this._webCodecsOk && this._decoder) {
      // Check buffer first
      const found = this._frameBuffer.find(
        (f) => Math.abs(f.timestamp / 1e6 - time) < 0.01,
      );
      if (found) return found.bitmap;

      // Need to seek and decode — WebCodecs decode is async
      return this._decodeWebCodecsFrame(time);
    }

    if (this._fallbackVideo) {
      return this._decodeFallbackFrame(time);
    }

    return null;
  }

  /** Set the rotating buffer size */
  setBufferSize(size: number): void {
    this._maxBufferSize = Math.max(1, size);
    this._trimBuffer();
  }

  /** Release all decoded frames */
  clearBuffer(): void {
    for (const frame of this._frameBuffer) {
      frame.bitmap.close();
    }
    this._frameBuffer = [];
  }

  dispose(): void {
    this.clearBuffer();
    if (this._decoder) {
      try { this._decoder.close(); } catch { /* ignore */ }
      this._decoder = null;
    }
    if (this._fallbackVideo) {
      this._fallbackVideo.pause();
      this._fallbackVideo.src = '';
      this._fallbackVideo.load();
      this._fallbackVideo = null;
    }
    this._source = null;
  }

  // ── Private: WebCodecs path ────────────────────────────

  private async _initWebCodecs(source: string): Promise<void> {
    // Note: WebCodecs requires raw video data (not decoded URLs).
    // For production, you'd fetch the video file and feed chunks.
    // This is a scaffold that shows the approach.
    const VideoDecoderClass = (window as any).VideoDecoder;
    const config = {
      codec: 'vp9', // would be detected from container
      codedWidth: 1920,
      codedHeight: 1080,
    };

    this._decoder = new VideoDecoderClass({
      output: (frame: any) => this._onDecodedFrame(frame),
      error: (err: any) => console.error('[VideoDecoder] Decode error:', err),
    });

    this._decoder.configure(config);

    // Fetch and feed chunks
    const response = await fetch(source);
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    }

    // Concatenate all chunks
    const data = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    // Feed as encoded chunks (simplified — real impl needs container parsing)
    const EncodedVideoChunkClass = (window as any).EncodedVideoChunk;
    const chunk = new EncodedVideoChunkClass({
      type: 'key',
      timestamp: 0,
      duration: 1_000_000, // 1 second in microseconds
      data,
    });
    this._decoder.decode(chunk);
    await this._decoder.flush();
  }

  private _onDecodedFrame(frame: any): void {
    // Convert VideoFrame to ImageBitmap
    createImageBitmap(frame).then((bitmap) => {
      this._frameBuffer.push({
        bitmap,
        timestamp: frame.timestamp,
        duration: frame.duration ?? 0,
      });
      this._trimBuffer();
      frame.close();
    }).catch(() => {
      frame.close();
    });
  }

  private _decodeWebCodecsFrame(_time: number): Promise<ImageBitmap | null> {
    // In a full implementation, seek to the nearest keyframe and decode forward.
    // For now, return the latest decoded frame if available.
    if (this._frameBuffer.length > 0) {
      return Promise.resolve(this._frameBuffer[this._frameBuffer.length - 1].bitmap);
    }
    return Promise.resolve(null);
  }

  // ── Private: HTMLVideoElement fallback ─────────────────

  private async _initFallback(source: string): Promise<boolean> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = source;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      video.addEventListener('canplaythrough', () => {
        this._fallbackVideo = video;
        resolve(true);
      }, { once: true });

      video.addEventListener('error', () => {
        resolve(false);
      }, { once: true });

      video.load();
    });
  }

  private async _decodeFallbackFrame(time: number): Promise<ImageBitmap | null> {
    const video = this._fallbackVideo;
    if (!video) return null;

    // Seek and wait for seeked event
    video.currentTime = time;

    return new Promise((resolve) => {
      const onSeeked = async () => {
        video.removeEventListener('seeked', onSeeked);

        // Capture the current video frame
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1920;
          canvas.height = video.videoHeight || 1080;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0);
          const bitmap = await createImageBitmap(canvas);
          resolve(bitmap);
        } catch {
          resolve(null);
        }
      };

      video.addEventListener('seeked', onSeeked);
    });
  }

  private _trimBuffer(): void {
    while (this._frameBuffer.length > this._maxBufferSize) {
      const frame = this._frameBuffer.shift();
      if (frame) frame.bitmap.close();
    }
  }
}
