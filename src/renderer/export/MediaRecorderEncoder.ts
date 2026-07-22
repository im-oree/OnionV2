/**
 * MediaRecorderEncoder — universal WebM (and sometimes MP4) video encoder
 * using the browser's built-in MediaRecorder API.
 *
 * Works in all modern browsers:
 *   - Chrome/Edge: WebM (VP9 preferred, VP8 fallback), MP4 in Chromium 111+
 *   - Firefox: WebM (VP8/VP9)
 *   - Safari: WebM VP9 (recent), MP4 with H.264 in some versions
 *
 * Timing model: MediaRecorder captures wall-clock frames from a MediaStream.
 * To control frame rate precisely, we use captureStream(0) (manual mode) and
 * call requestFrame() on our schedule, gated by real setTimeout delays so the
 * encoder actually gets duration between frames.
 */

export type VideoCodec = 'vp9' | 'vp8' | 'h264' | 'auto';

export interface MediaRecorderEncoderOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number;    // bps
  codec: VideoCodec;
  container: 'webm' | 'mp4';
}

/** Detect the best supported MIME type for the requested config. */
export function pickSupportedMimeType(
  container: 'webm' | 'mp4',
  codec: VideoCodec,
): string | null {
  const tries: string[] = [];

  if (container === 'mp4') {
    if (codec === 'h264' || codec === 'auto') {
      tries.push('video/mp4;codecs=avc1.42E01E'); // baseline
      tries.push('video/mp4;codecs=avc1.4D4028'); // main
      tries.push('video/mp4;codecs=h264');
      tries.push('video/mp4');
    }
  } else {
    // webm
    if (codec === 'vp9' || codec === 'auto') {
      tries.push('video/webm;codecs=vp9,opus');
      tries.push('video/webm;codecs=vp9');
    }
    if (codec === 'vp8' || codec === 'auto') {
      tries.push('video/webm;codecs=vp8,opus');
      tries.push('video/webm;codecs=vp8');
    }
    tries.push('video/webm');
  }

  for (const t of tries) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

export class MediaRecorderEncoder {
  private opts: MediaRecorderEncoderOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stream: MediaStream | null = null;
  private track: CanvasCaptureMediaStreamTrack | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType: string = '';
  private _started = false;
  private _stopPromise: Promise<Blob> | null = null;
  private _frameIntervalMs: number;
  private _lastFrameSubmit = 0;

  constructor(opts: MediaRecorderEncoderOptions) {
    this.opts = opts;
    this._frameIntervalMs = 1000 / opts.fps;

    this.canvas = document.createElement('canvas');
    this.canvas.width = opts.width;
    this.canvas.height = opts.height;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    if (!this.ctx) throw new Error('Failed to create 2D context for encoder canvas');
  }

  /** Check MediaRecorder support & the requested container/codec combination. */
  static isSupported(container: 'webm' | 'mp4', codec: VideoCodec): boolean {
    if (typeof MediaRecorder === 'undefined') return false;
    return pickSupportedMimeType(container, codec) !== null;
  }

  /** Initialize the recorder. Must be called before addFrame. */
  async start(): Promise<void> {
    if (this._started) throw new Error('Encoder already started');

    const mime = pickSupportedMimeType(this.opts.container, this.opts.codec);
    if (!mime) {
      throw new Error(
        `No supported MIME type for ${this.opts.container}/${this.opts.codec} on this browser`,
      );
    }
    this.mimeType = mime;

    // captureStream(0) → manual frame requests via track.requestFrame()
    this.stream = this.canvas.captureStream(0);
    this.track = this.stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;

    this.recorder = new MediaRecorder(this.stream, {
      mimeType: mime,
      videoBitsPerSecond: this.opts.bitrate,
    });

    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    // Create a promise that resolves with the final blob when stop() completes
    this._stopPromise = new Promise((resolve, reject) => {
      if (!this.recorder) { reject(new Error('recorder gone')); return; }
      this.recorder.onstop = () => {
        try {
          const blob = new Blob(this.chunks, { type: this.mimeType });
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      };
      this.recorder.onerror = (ev) => {
        reject(new Error(`MediaRecorder error: ${(ev as any).error?.message ?? 'unknown'}`));
      };
    });

    // Start recording with a small timeslice so ondataavailable fires
    // periodically; helps memory usage for long recordings.
    this.recorder.start(1000);
    this._started = true;
    this._lastFrameSubmit = performance.now();

    // Prime: draw a black frame so the recorder has a valid first frame
    if (this.ctx) {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.opts.width, this.opts.height);
    }
    if (this.track && typeof this.track.requestFrame === 'function') {
      this.track.requestFrame();
    }
  }

  /**
   * Submit a rendered frame (ImageBitmap) at the correct wall-clock timing.
   * Waits so that real time passes between frames — MediaRecorder timestamps
   * based on when requestFrame() is called.
   */
  async addFrame(bitmap: ImageBitmap): Promise<void> {
    if (!this._started || !this.ctx || !this.track) {
      throw new Error('Encoder not started');
    }

    // Draw the bitmap into the encoder canvas
    this.ctx.clearRect(0, 0, this.opts.width, this.opts.height);
    this.ctx.drawImage(bitmap, 0, 0, this.opts.width, this.opts.height);

    // Wait so that _frameIntervalMs has elapsed since the last frame was submitted.
    // This gives the MediaRecorder the wall-clock timing it needs to produce
    // a video of the correct duration.
    const now = performance.now();
    const elapsed = now - this._lastFrameSubmit;
    const waitMs = this._frameIntervalMs - elapsed;
    if (waitMs > 0) {
      await this._preciseWait(waitMs);
    }
    this._lastFrameSubmit = performance.now();

    // Submit frame to encoder
    if (typeof this.track.requestFrame === 'function') {
      this.track.requestFrame();
    }
  }

  /** Stop recording and return the finalized Blob. */
  async finish(): Promise<Blob> {
    if (!this._started || !this.recorder || !this._stopPromise) {
      throw new Error('Encoder not started');
    }
    // Give the recorder a moment to flush the last frame
    await this._preciseWait(this._frameIntervalMs);
    this.recorder.stop();
    this.stream?.getTracks().forEach(t => t.stop());
    return this._stopPromise;
  }

  /** Cancel without saving. */
  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.stop();
      }
      this.stream?.getTracks().forEach(t => t.stop());
    } catch { /* ignore */ }
    this.chunks = [];
    this._started = false;
  }

  get mime(): string { return this.mimeType; }

  // Precise wait using requestAnimationFrame + setTimeout hybrid for accuracy
  private async _preciseWait(ms: number): Promise<void> {
    if (ms <= 0) return;
    if (ms < 4) {
      // Sub-4ms: setTimeout(0) is clamped, so just yield
      await new Promise(r => setTimeout(r, 0));
      return;
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}