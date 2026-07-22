/**
 * ImageSequenceEncoder — collects encoded frame blobs and delivers them
 * as either:
 *   (a) individual files in a user-picked directory (File System Access API)
 *   (b) a single ZIP blob (fflate) — universal fallback
 *
 * Streams frames incrementally so we don't buffer all frames in memory
 * for long sequences.
 */
import { zip, type Zippable } from 'fflate';
import { pickDirectory, writeFileToDir, saveFile } from './FileSaver';

export type SequenceDelivery = 'directory' | 'zip';

export interface SequenceEncoderOptions {
  /** File extension WITHOUT dot: 'png' | 'jpg' */
  extension: string;
  /** Base name for output files (e.g. "myExport" -> "myExport_00001.png") */
  baseName: string;
  /** Total frames — used for zero-padding filename numbers */
  totalFrames: number;
  /** How to deliver the sequence */
  delivery: SequenceDelivery;
  /** Only for delivery === 'directory'. If null, will prompt user. */
  directoryHandle?: FileSystemDirectoryHandle | null;
  /** For 'zip' delivery: called at end with the final blob to save */
  useSaveDialog?: boolean;
}

export interface SequenceEncoderResult {
  saved: boolean;
  cancelled: boolean;
  method: string;
  frameCount: number;
  totalBytes: number;
  path?: string;
  error?: string;
}

export class ImageSequenceEncoder {
  private opts: SequenceEncoderOptions;
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private zipEntries: Zippable = {};   // filename -> Uint8Array (streamed)
  private _totalBytes = 0;
  private _frameCount = 0;
  private _padWidth: number;

  constructor(opts: SequenceEncoderOptions) {
    this.opts = opts;
    // Zero-pad to enough digits (min 5) so lexical sort matches numeric
    this._padWidth = Math.max(5, String(opts.totalFrames).length);
    this.dirHandle = opts.directoryHandle ?? null;
  }

  /** Prepare delivery target. For directory mode, prompts user if no handle. */
  async prepare(): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> {
    if (this.opts.delivery === 'directory') {
      if (!this.dirHandle) {
        this.dirHandle = await pickDirectory();
        if (!this.dirHandle) {
          return { ok: false, cancelled: true, error: 'Directory pick cancelled' };
        }
      }
    }
    return { ok: true };
  }

  /** Add a single encoded frame. */
  async addFrame(frameNumber: number, blob: Blob): Promise<void> {
    const filename = this._makeFilename(frameNumber);
    this._totalBytes += blob.size;
    this._frameCount++;

    if (this.opts.delivery === 'directory' && this.dirHandle) {
      // Write directly to disk — no memory accumulation
      await writeFileToDir(this.dirHandle, filename, blob);
    } else {
      // Buffer for ZIP finalization
      const arr = new Uint8Array(await blob.arrayBuffer());
      this.zipEntries[filename] = arr;
    }
  }

  /** Finalize the delivery. Returns save result. */
  async finalize(): Promise<SequenceEncoderResult> {
    if (this.opts.delivery === 'directory') {
      return {
        saved: true,
        cancelled: false,
        method: 'directory',
        frameCount: this._frameCount,
        totalBytes: this._totalBytes,
        path: this.dirHandle?.name,
      };
    }

    // ZIP delivery — build the zip async
    const zipBlob = await new Promise<Blob>((resolve, reject) => {
      zip(this.zipEntries, { level: 6 }, (err, data) => {
        if (err) reject(err);
        else resolve(new Blob([data], { type: 'application/zip' }));
      });
    });

    const saveRes = await saveFile(
      zipBlob,
      this.opts.baseName,
      'zip',
      this.opts.useSaveDialog ?? true,
      'application/zip',
    );

    return {
      saved: saveRes.saved,
      cancelled: saveRes.cancelled,
      method: saveRes.method,
      frameCount: this._frameCount,
      totalBytes: zipBlob.size,
      path: saveRes.path,
      error: saveRes.error,
    };
  }

  /** Cancel/cleanup partial delivery. */
  dispose(): void {
    this.zipEntries = {};
  }

  private _makeFilename(frameNumber: number): string {
    const padded = String(frameNumber).padStart(this._padWidth, '0');
    return `${this.opts.baseName}_${padded}.${this.opts.extension}`;
  }
}