/**
 * WebCodecsEncoder — high-performance video encoding using the browser's
 * native WebCodecs VideoEncoder API + mp4-muxer / webm-muxer for containers.
 *
 * Advantages over MediaRecorder:
 *   - No wall-clock timing — encodes as fast as CPU/GPU allows
 *   - Exact bitrate control
 *   - Precise per-frame timestamps
 *   - Real MP4 output (not just WebM) on all Chromium/Safari
 *   - H.264, H.265, VP9, VP8, AV1 support
 *
 * Support:
 *   - Chrome/Edge 94+: full (all codecs, hardware where available)
 *   - Safari 16.4+: partial (H.264 hardware, no H.265 export)
 *   - Firefox: partial (WebM VP8/VP9), no MP4 as of writing
 *
 * Falls back to MediaRecorderEncoder when unavailable.
 */

// Dynamic imports so the muxers load only when this encoder is used
type Mp4MuxerModule = typeof import('mp4-muxer');
type WebmMuxerModule = typeof import('webm-muxer');

export type WebCodecsCodec = 'h264' | 'h265' | 'vp9' | 'vp8' | 'av1';

export interface WebCodecsEncoderOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number;         // bps
  codec: WebCodecsCodec;
  container: 'mp4' | 'webm';
  keyframeIntervalSec?: number;  // default 2s
}

/** Detect WebCodecs + muxer support for a given codec+container. */
export function isWebCodecsSupported(
  container: 'mp4' | 'webm',
  codec: WebCodecsCodec,
): boolean {
  if (typeof VideoEncoder === 'undefined') return false;
  // Container/codec sanity checks
  if (container === 'mp4' && !(codec === 'h264' || codec === 'h265' || codec === 'av1')) return false;
  if (container === 'webm' && !(codec === 'vp9' || codec === 'vp8' || codec === 'av1')) return false;
  return true;
}

/** Quick async check: is this codec + config actually encodable right now? */
export async function checkCodecConfig(
  codec: WebCodecsCodec,
  width: number,
  height: number,
): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false;
  try {
    const codecString = mapCodecString(codec, width, height);
    const support = await VideoEncoder.isConfigSupported({
      codec: codecString,
      width, height,
      bitrate: 1_000_000,
      framerate: 30,
    });
    return support.supported === true;
  } catch {
    return false;
  }
}

/**
 * Map our codec enum → WebCodecs "codec string" per RFC 6381.
 * Bitrate/profile choices tuned for broad compatibility.
 */
function mapCodecString(codec: WebCodecsCodec, w: number, h: number): string {
  switch (codec) {
    case 'h264': {
      // Baseline profile (42), constrained baseline (E0), level auto
      // Level based on resolution — 4.0 covers up to 1080p30, 5.1 for 4K30
      const pixels = w * h;
      let level = '1E'; // 3.0
      if (pixels > 921_600) level = '28';       // 4.0 (1080p)
      if (pixels > 2_073_600) level = '32';     // 5.0 (1440p)
      if (pixels > 3_686_400) level = '33';     // 5.1 (2160p)
      return `avc1.4200${level}`;
    }
    case 'h265':
      // HEVC Main profile, level 4.1
      return 'hvc1.1.6.L120.90';
    case 'vp9':
      // VP9 Profile 0 (8-bit 4:2:0)
      return 'vp09.00.10.08';
    case 'vp8':
      return 'vp8';
    case 'av1':
      // AV1 Main Profile, level 4.0
      return 'av01.0.04M.08';
  }
}

export class WebCodecsEncoder {
  private opts: WebCodecsEncoderOptions;
  private encoder: VideoEncoder | null = null;
  private muxer: any = null;  // Mp4Muxer or WebMMuxer instance
  private target: any = null; // ArrayBufferTarget from muxer
  private _frameCount = 0;
  private _mimeType = '';
  private _keyframeIntervalFrames: number;
  private _errored: Error | null = null;

  constructor(opts: WebCodecsEncoderOptions) {
    this.opts = opts;
    this._keyframeIntervalFrames = Math.max(1, Math.round(
      (opts.keyframeIntervalSec ?? 2) * opts.fps,
    ));
    this._mimeType = opts.container === 'mp4' ? 'video/mp4' : 'video/webm';
  }

  static isSupported(container: 'mp4' | 'webm', codec: WebCodecsCodec): boolean {
    return isWebCodecsSupported(container, codec);
  }

  async start(): Promise<void> {
    const { width, height, fps, bitrate, codec, container } = this.opts;

    // Try multiple codec string variants for compatibility across browsers
    const codecCandidates = this._codecCandidates(codec, width, height);

    // Try each candidate with hardware, then software preference
    let workingConfig: VideoEncoderConfig | null = null;
    let lastError: string = '';

    for (const codecString of codecCandidates) {
      for (const hw of ['prefer-hardware', 'no-preference', 'prefer-software'] as HardwareAcceleration[]) {
        const cfg: VideoEncoderConfig = {
          codec: codecString,
          width, height,
          bitrate,
          framerate: fps,
          latencyMode: 'quality',
          hardwareAcceleration: hw,
        };
        try {
          const support = await VideoEncoder.isConfigSupported(cfg);
          if (support.supported) {
            workingConfig = support.config ?? cfg;
            break;
          } else {
            lastError = `${codecString} @ ${hw} not supported`;
          }
        } catch (e: any) {
          lastError = `${codecString} @ ${hw}: ${e?.message ?? e}`;
        }
      }
      if (workingConfig) break;
    }

    if (!workingConfig) {
      throw new Error(
        `WebCodecs: no supported config for ${codec} @ ${width}x${height} ${fps}fps ${bitrate}bps. ` +
        `Last error: ${lastError}`,
      );
    }

    // Load appropriate muxer
    if (container === 'mp4') {
      const mp4Muxer: Mp4MuxerModule = await import('mp4-muxer');
      this.target = new mp4Muxer.ArrayBufferTarget();
      this.muxer = new mp4Muxer.Muxer({
        target: this.target,
        video: {
          codec: this._muxerVideoCodecName(codec) as any,
          width,
          height,
        },
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset',
      });
    } else {
      const webmMuxer: WebmMuxerModule = await import('webm-muxer');
      this.target = new webmMuxer.ArrayBufferTarget();
      this.muxer = new webmMuxer.Muxer({
        target: this.target,
        video: {
          codec: this._muxerVideoCodecName(codec) as any,
          width,
          height,
        },
        firstTimestampBehavior: 'offset',
      });
    }

    // Audio track (populated by ExportEngine before start() was called)
    if ((this as any)._audioTrack) {
      const at = (this as any)._audioTrack;
      if (container === 'mp4') {
        const mp4Muxer: Mp4MuxerModule = await import('mp4-muxer');
        this.target = new mp4Muxer.ArrayBufferTarget();
        this.muxer = new mp4Muxer.Muxer({
          target: this.target,
          video: {
            codec: this._muxerVideoCodecName(codec) as any,
            width, height,
          },
          audio: {
            codec: 'aac',
            sampleRate: at.sampleRate,
            numberOfChannels: at.channels,
          },
          fastStart: 'in-memory',
          firstTimestampBehavior: 'offset',
        });
      } else {
        const webmMuxer: WebmMuxerModule = await import('webm-muxer');
        this.target = new webmMuxer.ArrayBufferTarget();
        this.muxer = new webmMuxer.Muxer({
          target: this.target,
          video: {
            codec: this._muxerVideoCodecName(codec) as any,
            width, height,
          },
          audio: {
            codec: 'A_OPUS',
            sampleRate: at.sampleRate,
            numberOfChannels: at.channels,
          },
          firstTimestampBehavior: 'offset',
        });
      }
      // Add all pre-encoded audio chunks now — they'll be interleaved properly
      // by the muxer based on their timestamps.
      for (const { chunk, meta } of at.chunks) {
        this.muxer.addAudioChunk(chunk, meta);
      }
    }

    // Create the VideoEncoder with the working config
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try {
          this.muxer.addVideoChunk(chunk, meta);
        } catch (err: any) {
          this._errored = new Error(`Muxer error: ${err?.message ?? err}`);
        }
      },
      error: (err) => {
        this._errored = new Error(`Encoder runtime error: ${err.message}`);
      },
    });

    try {
      this.encoder.configure(workingConfig);
    } catch (err: any) {
      throw new Error(`Encoder configure failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Generate a list of codec strings to try, from most-specific to most-general.
   * Some browsers accept only exact strings, others accept short names.
   */
  private _codecCandidates(codec: WebCodecsCodec, w: number, h: number): string[] {
    switch (codec) {
      case 'h264': {
        const pixels = w * h;
        let level = '1E';
        if (pixels > 921_600) level = '28';
        if (pixels > 2_073_600) level = '32';
        if (pixels > 3_686_400) level = '33';
        return [
          `avc1.4200${level}`,   // Baseline
          `avc1.4D40${level}`,   // Main
          `avc1.6400${level}`,   // High
        ];
      }
      case 'h265':
        return [
          'hvc1.1.6.L120.90',
          'hvc1.1.6.L93.90',
          'hev1.1.6.L120.90',
        ];
      case 'vp9':
        return [
          'vp09.00.10.08',   // Profile 0, Level 1.0, 8-bit
          'vp09.00.51.08',   // Profile 0, Level 5.1, 8-bit
          'vp09.02.10.10',   // Profile 2, 10-bit
        ];
      case 'vp8':
        return ['vp8'];
      case 'av1':
        return [
          'av01.0.04M.08',
          'av01.0.08M.08',
          'av01.0.05M.08',
        ];
    }
  }

  /**
   * Encode a rendered frame.
   * bitmap is consumed (drawn onto a VideoFrame); caller may close after.
   */
  async addFrame(bitmap: ImageBitmap): Promise<void> {
    if (this._errored) throw this._errored;
    if (!this.encoder) throw new Error('Encoder not started');

    // Backpressure: if encoder is overloaded, wait
    while (this.encoder.encodeQueueSize > 3) {
      await new Promise(r => setTimeout(r, 4));
    }

    const timestampUs = Math.round((this._frameCount / this.opts.fps) * 1_000_000);
    const durationUs = Math.round(1_000_000 / this.opts.fps);

    const videoFrame = new VideoFrame(bitmap, {
      timestamp: timestampUs,
      duration: durationUs,
    });

    // Insert keyframe periodically for seek support
    const isKeyFrame = (this._frameCount % this._keyframeIntervalFrames) === 0;
    this.encoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    this._frameCount++;
  }

  /** Flush and return the final Blob. */
  async finish(): Promise<Blob> {
    if (!this.encoder) throw new Error('Encoder not started');
    if (this._errored) throw this._errored;

    await this.encoder.flush();
    this.encoder.close();
    this.encoder = null;

    if (this._errored) throw this._errored;

    this.muxer.finalize();
    const buffer: ArrayBuffer = this.target.buffer;
    return new Blob([buffer], { type: this._mimeType });
  }

  /** Cancel + release. */
  cancel(): void {
    try { this.encoder?.close(); } catch { /* ignore */ }
    this.encoder = null;
    this.muxer = null;
    this.target = null;
  }

  get mime(): string { return this._mimeType; }
  get frameCount(): number { return this._frameCount; }

  private _muxerVideoCodecName(c: WebCodecsCodec): string {
    switch (c) {
      case 'h264': return 'avc';
      case 'h265': return 'hevc';
      case 'vp9':  return 'V_VP9';
      case 'vp8':  return 'V_VP8';
      case 'av1':  return this.opts.container === 'mp4' ? 'av1' : 'V_AV1';
    }
  }
}