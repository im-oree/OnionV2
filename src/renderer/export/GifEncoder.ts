/**
 * GifEncoder — animated GIF export using gifenc (~15KB, WASM-free, fast).
 *
 * gifenc quantizes each frame's palette. For quality/perf tradeoff we use
 * a global palette from the first frame by default; can be per-frame for
 * dynamic content.
 */
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface GifEncoderOptions {
  width: number;
  height: number;
  fps: number;
  quality: number;    // 1-100 → palette size 8-256
  loopCount: number;  // 0 = infinite
}

export class GifExportEncoder {
  private opts: GifEncoderOptions;
  private encoder: ReturnType<typeof GIFEncoder>;
  private _scratch: OffscreenCanvas | HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private _frameCount = 0;
  private _paletteSize: number;
  private _delayMs: number;

  constructor(opts: GifEncoderOptions) {
    this.opts = opts;
    // Map quality 1-100 → palette size 8-256 (log-ish scale)
    this._paletteSize = Math.max(8, Math.min(256, Math.round(Math.pow(opts.quality / 100, 0.6) * 256)));
    this._delayMs = Math.round(1000 / opts.fps);

    this.encoder = GIFEncoder();

    if (typeof OffscreenCanvas !== 'undefined') {
      this._scratch = new OffscreenCanvas(opts.width, opts.height);
    } else {
      this._scratch = document.createElement('canvas');
      this._scratch.width = opts.width;
      this._scratch.height = opts.height;
    }
    const ctx = this._scratch.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for GIF encoder');
    this._ctx = ctx;
  }

  async start(): Promise<void> {
    // gifenc doesn't need an async init; kept for interface parity
  }

  async addFrame(bitmap: ImageBitmap): Promise<void> {
    // Draw frame into scratch canvas at target size
    this._ctx.clearRect(0, 0, this.opts.width, this.opts.height);
    (this._ctx as any).drawImage(bitmap, 0, 0, this.opts.width, this.opts.height);
    const imageData = this._ctx.getImageData(0, 0, this.opts.width, this.opts.height);
    const data = new Uint8ClampedArray(imageData.data.buffer);

    // Quantize palette (per-frame for accurate colors)
    const palette = quantize(data, this._paletteSize, { format: 'rgb565' });
    const indexed = applyPalette(data, palette, 'rgb565');

    this.encoder.writeFrame(indexed, this.opts.width, this.opts.height, {
      palette,
      delay: this._delayMs,
      repeat: this._frameCount === 0 ? this.opts.loopCount : undefined,
    });

    this._frameCount++;
  }

  async finish(): Promise<Blob> {
    this.encoder.finish();
    const bytes = this.encoder.bytes();
    return new Blob([bytes], { type: 'image/gif' });
  }

  cancel(): void {
    // gifenc has no explicit cancel; just abandon
    this._frameCount = 0;
  }

  get mime(): string { return 'image/gif'; }
  get frameCount(): number { return this._frameCount; }
}
