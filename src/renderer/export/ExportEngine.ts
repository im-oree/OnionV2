/**
 * ExportEngine — orchestrates the full export pipeline.
 *
 * Emits events:
 *   'progress'  — { currentFrame, totalFrames, elapsedMs, etaMs, avgFrameMs, lastFrameMs }
 *   'preview'   — { bitmap, frameNumber }
 *   'done'      — { blob?, size, url?, name, method }
 *   'error'     — { message }
 *   'cancelled' — {}
 *   'status'    — ExportStatus
 *
 * Stage B: single frame formats
 * Stage C: PNG/JPG sequence via directory picker or ZIP
 */
import type { Renderer } from '../Renderer';
import type { Composition } from '../../types/composition';
import { FrameRenderer } from './FrameRenderer';
import { saveFile } from './FileSaver';
import { ImageSequenceEncoder, type SequenceDelivery } from './ImageSequenceEncoder';
import { MediaRecorderEncoder } from './MediaRecorderEncoder';
import { WebCodecsEncoder, type WebCodecsCodec, checkCodecConfig } from './WebCodecsEncoder';
import { GifExportEncoder } from './GifEncoder';
import { mixCompositionAudio } from './AudioMixer';
import { encodeWav, encodeWithWebCodecs, type WebCodecsAudioCodec } from './AudioEncoders';
import { encodeMp3 } from './Mp3Encoder';
import {
  formatCategory,
  formatSupportsAudio,
  FORMAT_EXTENSIONS,
  type ExportSettings,
  type ExportStatus,
} from './types';

type EventName = 'progress' | 'preview' | 'done' | 'error' | 'cancelled' | 'status';
type Handler = (payload: any) => void;

export interface ExportProgressPayload {
  currentFrame: number;
  totalFrames: number;
  elapsedMs: number;
  etaMs: number;
  avgFrameMs: number;
  lastFrameMs: number;
}

export interface ExportPreviewPayload {
  bitmap: ImageBitmap;
  frameNumber: number;
}

export interface ExportDonePayload {
  blob?: Blob;
  size: number;
  name: string;
  method: string;
  frameCount?: number;
}

export class ExportEngine {
  private renderer: Renderer;
  private frameRenderer: FrameRenderer;
  private handlers = new Map<EventName, Set<Handler>>();
  private _status: ExportStatus = 'idle';
  private _cancelled = false;
  private _pauseResolver: (() => void) | null = null;
  private _paused = false;
  private _startTime = 0;
  private _frameTimes: number[] = [];

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.frameRenderer = new FrameRenderer(renderer);
  }

  get status(): ExportStatus { return this._status; }
  get isRunning(): boolean {
    return this._status === 'preparing' || this._status === 'rendering' ||
           this._status === 'encoding' || this._status === 'paused';
  }

  on(event: EventName, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: EventName, payload?: any): void {
    this.handlers.get(event)?.forEach(h => {
      try { h(payload); } catch (err) { console.error('[ExportEngine] handler err:', err); }
    });
  }

  private setStatus(status: ExportStatus): void {
    this._status = status;
    this.emit('status', status);
  }

  async start(comp: Composition, settings: ExportSettings): Promise<void> {
    if (this.isRunning) {
      throw new Error('Export already in progress');
    }
    this._cancelled = false;
    this._paused = false;
    this._pauseResolver = null;
    this._frameTimes = [];
    this._startTime = performance.now();
    this.setStatus('preparing');

    try {
      const category = formatCategory(settings.format);

      if (category === 'frame') {
        await this._exportSingleFrame(comp, settings);
      } else if (category === 'sequence') {
        await this._exportImageSequence(comp, settings);
      } else if (category === 'video') {
        await this._exportVideo(comp, settings);
      } else if (category === 'audio') {
        await this._exportAudioOnly(comp, settings);
        return;
      }
    } catch (err: any) {
      if (this._cancelled) {
        this.setStatus('cancelled');
        this.emit('cancelled');
      } else {
        this.setStatus('error');
        this.emit('error', { message: err?.message ?? String(err) });
      }
    } finally {
      this.frameRenderer.finish();
    }
  }

  pause(): void {
    if (!this.isRunning || this._paused) return;
    this._paused = true;
    this.setStatus('paused');
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this.setStatus('rendering');
    if (this._pauseResolver) {
      this._pauseResolver();
      this._pauseResolver = null;
    }
  }

  cancel(): void {
    this._cancelled = true;
    if (this._paused) this.resume();
  }

  private async _throttleIfPaused(): Promise<void> {
    if (!this._paused) return;
    await new Promise<void>((res) => { this._pauseResolver = res; });
  }

  private _emitProgress(currentFrame: number, totalFrames: number, lastFrameMs: number): void {
    const elapsedMs = performance.now() - this._startTime;
    const avgFrameMs = this._frameTimes.length > 0
      ? this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length
      : 0;
    // ETA based on recent average (last 20 frames) for adaptive estimate
    const recent = this._frameTimes.slice(-20);
    const recentAvg = recent.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : avgFrameMs;
    const framesLeft = Math.max(0, totalFrames - currentFrame);
    const etaMs = framesLeft * recentAvg;
    this.emit('progress', {
      currentFrame, totalFrames, elapsedMs, etaMs, avgFrameMs, lastFrameMs,
    } satisfies ExportProgressPayload);
  }

  // ── Single frame ────────────────────────────────────────────────
  private async _exportSingleFrame(
    comp: Composition,
    settings: ExportSettings,
  ): Promise<void> {
    this.setStatus('rendering');
    const startFrame = Math.max(0, Math.min(
      Math.floor(comp.duration * comp.fps) - 1,
      settings.range.startFrame,
    ));
    this.frameRenderer.beginExport(settings.width, settings.height);

    const frameStart = performance.now();
    const frame = await this.frameRenderer.renderFrame(
      comp.id, startFrame, settings.fps,
      settings.width, settings.height,
    );
    const renderMs = performance.now() - frameStart;
    this._frameTimes.push(renderMs);

    this.emit('preview', { bitmap: frame.bitmap, frameNumber: startFrame });
    this._emitProgress(1, 1, renderMs);

    if (this._cancelled) throw new Error('cancelled');

    this.setStatus('encoding');
    const fmtMap = { 'frame-png': 'png', 'frame-jpg': 'jpg', 'frame-webp': 'webp' } as const;
    const ext = fmtMap[settings.format as keyof typeof fmtMap] ?? 'png';
    const blob = await this.frameRenderer.encodeFrame(frame, ext, settings.quality);
    frame.bitmap.close();

    if (this._cancelled) throw new Error('cancelled');

    const fileExt = FORMAT_EXTENSIONS[settings.format];
    const saveRes = await saveFile(
      blob, settings.fileName, fileExt, settings.useSaveDialog,
    );

    if (saveRes.cancelled) {
      this.setStatus('cancelled');
      this.emit('cancelled');
      return;
    }
    if (!saveRes.saved) {
      throw new Error(saveRes.error ?? 'File save failed');
    }

    this.setStatus('done');
    this.emit('done', {
      blob, size: blob.size,
      name: saveRes.path ?? settings.fileName,
      method: saveRes.method,
    } satisfies ExportDonePayload);
  }

  // ── Image sequence (PNG / JPG) ──────────────────────────────────
  private async _exportImageSequence(
    comp: Composition,
    settings: ExportSettings,
  ): Promise<void> {
    const startFrame = Math.max(0, settings.range.startFrame);
    const endFrame = Math.min(
      Math.floor(comp.duration * comp.fps) - 1,
      settings.range.endFrame,
    );
    if (endFrame < startFrame) {
      throw new Error(`Invalid frame range: ${startFrame} to ${endFrame}`);
    }
    const totalFrames = endFrame - startFrame + 1;
    const isPng = settings.format === 'png-sequence';
    const ext = isPng ? 'png' : 'jpg';

    // Determine delivery: prefer directory picker if user chose "save dialog"
    // and File System Access is supported; else fall back to ZIP.
    const preferDirectory =
      settings.useSaveDialog && 'showDirectoryPicker' in window;
    const delivery: SequenceDelivery = preferDirectory ? 'directory' : 'zip';

    const encoder = new ImageSequenceEncoder({
      extension: ext,
      baseName: settings.fileName,
      totalFrames,
      delivery,
      useSaveDialog: settings.useSaveDialog,
    });

    const prep = await encoder.prepare();
    if (!prep.ok) {
      if (prep.cancelled) {
        this.setStatus('cancelled');
        this.emit('cancelled');
        return;
      }
      throw new Error(prep.error ?? 'Failed to prepare sequence output');
    }

    this.frameRenderer.beginExport(settings.width, settings.height);
    this.setStatus('rendering');

    for (let f = startFrame; f <= endFrame; f++) {
      // Cancel/pause checkpoints
      await this._throttleIfPaused();
      if (this._cancelled) {
        encoder.dispose();
        throw new Error('cancelled');
      }

      const frameStart = performance.now();

      // 1. Render
      const rendered = await this.frameRenderer.renderFrame(
        comp.id, f, settings.fps,
        settings.width, settings.height,
      );

      // 2. Encode
      const blob = await this.frameRenderer.encodeFrame(rendered, ext, settings.quality);

      // 3. Add to encoder (writes to disk or buffers for ZIP)
      await encoder.addFrame(f, blob);

      const totalFrameMs = performance.now() - frameStart;
      this._frameTimes.push(totalFrameMs);

      // 4. Emit preview + progress
      // Note: emitting the bitmap transfers ownership to the consumer.
      // The progress dialog closes it; if no listener attached, GC handles it.
      this.emit('preview', { bitmap: rendered.bitmap, frameNumber: f });
      const currentCount = f - startFrame + 1;
      this._emitProgress(currentCount, totalFrames, totalFrameMs);

      // Yield to event loop periodically so UI stays responsive
      if (currentCount % 4 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // 5. Finalize (ZIP compression if applicable — this can be slow for large seqs)
    if (delivery === 'zip') {
      this.setStatus('encoding');
    }

    const result = await encoder.finalize();
    encoder.dispose();

    if (result.cancelled) {
      this.setStatus('cancelled');
      this.emit('cancelled');
      return;
    }
    if (!result.saved) {
      throw new Error(result.error ?? 'Failed to save sequence');
    }

    this.setStatus('done');
    this.emit('done', {
      size: result.totalBytes,
      name: result.path ?? settings.fileName,
      method: result.method,
      frameCount: result.frameCount,
    } satisfies ExportDonePayload);
  }

  // ── Video (WebM via MediaRecorder, or MP4 if supported natively) ──
  // ── Video (WebCodecs preferred, MediaRecorder fallback) ──────────
  private async _exportVideo(
    comp: Composition,
    settings: ExportSettings,
  ): Promise<void> {
    const startFrame = Math.max(0, settings.range.startFrame);
    const endFrame = Math.min(
      Math.floor(comp.duration * comp.fps) - 1,
      settings.range.endFrame,
    );
    if (endFrame < startFrame) {
      throw new Error(`Invalid frame range: ${startFrame} to ${endFrame}`);
    }
    const totalFrames = endFrame - startFrame + 1;

    // Map format → container + codec
    let container: 'webm' | 'mp4';
    let wcCodec: WebCodecsCodec;
    switch (settings.format) {
      case 'webm-vp9':  container = 'webm'; wcCodec = 'vp9'; break;
      case 'webm-vp8':  container = 'webm'; wcCodec = 'vp8'; break;
      case 'mp4-h264':  container = 'mp4';  wcCodec = 'h264'; break;
      case 'mp4-h265':  container = 'mp4';  wcCodec = 'h265'; break;
      case 'gif':
        await this._exportGif(comp, settings);
        return;
      default:
        container = 'webm'; wcCodec = 'vp9';
    }

    // Decide encoder based on user preference + capability
    const wantWebCodecs =
      settings.encoder === 'auto' || settings.encoder === 'webcodecs';
    const wantMediaRecorder =
      settings.encoder === 'auto' || settings.encoder === 'mediarecorder';
    const wantFFmpeg = settings.encoder === 'ffmpeg';

    let useWebCodecs = false;
    if (wantWebCodecs && WebCodecsEncoder.isSupported(container, wcCodec)) {
      // Also do the async config check to catch e.g. resolution limits
      const configOk = await checkCodecConfig(
        wcCodec, settings.width, settings.height,
      );
      if (configOk) useWebCodecs = true;
    }

    if (wantFFmpeg) {
      // Stage G will implement this. For now, fall back with a message.
      this.setStatus('error');
      this.emit('error', {
        message: 'FFmpeg encoder arrives in Stage G. Try Auto or WebCodecs.',
      });
      return;
    }

    if (useWebCodecs) {
      await this._exportVideoWebCodecs(
        comp, settings, startFrame, endFrame, totalFrames, container, wcCodec,
      );
      return;
    }

    if (!wantMediaRecorder) {
      throw new Error(
        `WebCodecs not available for ${settings.format} on this browser. ` +
        `Switch Encoder to "Auto" to allow MediaRecorder fallback.`,
      );
    }

    // MediaRecorder fallback (existing path)
    await this._exportVideoMediaRecorder(
      comp, settings, startFrame, endFrame, totalFrames, container, wcCodec,
    );
  }

  // ── WebCodecs video path ─────────────────────────────────────────
  private async _exportVideoWebCodecs(
    comp: Composition,
    settings: ExportSettings,
    startFrame: number,
    endFrame: number,
    totalFrames: number,
    container: 'mp4' | 'webm',
    codec: WebCodecsCodec,
  ): Promise<void> {
    // Pre-mix audio if requested (fast — OfflineAudioContext)
    let audioBuffer: AudioBuffer | null = null;
    let audioChunks: Array<{ chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }> = [];
    let audioCodecString: string | null = null;
    const includeAudio = settings.includeAudio && formatSupportsAudio(settings.format);

    if (includeAudio) {
      this.setStatus('preparing');
      const mix = await mixCompositionAudio(comp, {
        sampleRate: settings.audioSampleRate,
        channels: settings.audioChannels,
        startFrame,
        endFrame,
      });
      if (mix) {
        audioBuffer = mix.buffer;
        // Pre-encode audio to raw chunks now (we'll add them into the muxer)
        const wcCodec: WebCodecsAudioCodec =
          container === 'mp4' ? 'aac' : 'opus';
        try {
          const result = await encodeWithWebCodecs(audioBuffer, wcCodec, {
            sampleRate: settings.audioSampleRate,
            channels: settings.audioChannels,
            bitrate: settings.audioBitrate,
          });
          audioChunks = result.chunks;
          audioCodecString = wcCodec === 'aac' ? 'aac' : 'A_OPUS';
        } catch (err: any) {
          // Audio encoding failed — continue with video-only rather than aborting
          console.warn('[ExportEngine] Audio encode failed; exporting video-only:', err?.message);
          audioBuffer = null;
        }
      }
    }

    const encoder = new WebCodecsEncoder({
      width: settings.width,
      height: settings.height,
      fps: settings.fps,
      bitrate: settings.bitrate,
      codec,
      container,
      keyframeIntervalSec: 2,
    });

    // Inject audio into muxer if we have it
    (encoder as any)._audioTrack = audioBuffer
      ? {
          chunks: audioChunks,
          codec: audioCodecString,
          sampleRate: settings.audioSampleRate,
          channels: settings.audioChannels,
        }
      : null;

    this.setStatus('preparing');
    await encoder.start();
    this.setStatus('rendering');

    try {
      this.frameRenderer.beginExport(settings.width, settings.height);

      for (let f = startFrame; f <= endFrame; f++) {
        await this._throttleIfPaused();
        if (this._cancelled) { encoder.cancel(); throw new Error('cancelled'); }

        const frameStart = performance.now();
        const rendered = await this.frameRenderer.renderFrame(
          comp.id, f, settings.fps, settings.width, settings.height,
        );

        this.emit('preview', { bitmap: rendered.bitmap, frameNumber: f });
        await encoder.addFrame(rendered.bitmap);
        rendered.bitmap.close();

        const totalFrameMs = performance.now() - frameStart;
        this._frameTimes.push(totalFrameMs);
        const currentCount = f - startFrame + 1;
        this._emitProgress(currentCount, totalFrames, totalFrameMs);
        if (currentCount % 4 === 0) await new Promise(r => setTimeout(r, 0));
      }

      this.setStatus('encoding');
      const blob = await encoder.finish();

      if (this._cancelled) throw new Error('cancelled');

      const ext = container === 'mp4' ? 'mp4' : 'webm';
      const saveRes = await saveFile(
        blob, settings.fileName, ext, settings.useSaveDialog, encoder.mime,
      );

      if (saveRes.cancelled) {
        this.setStatus('cancelled');
        this.emit('cancelled');
        return;
      }
      if (!saveRes.saved) throw new Error(saveRes.error ?? 'Failed to save video');

      this.setStatus('done');
      this.emit('done', {
        blob, size: blob.size,
        name: saveRes.path ?? settings.fileName,
        method: saveRes.method,
        frameCount: totalFrames,
      } satisfies ExportDonePayload);
    } catch (err) {
      encoder.cancel();
      throw err;
    }
  }

  // ── MediaRecorder video path (fallback) ──────────────────────────
  private async _exportVideoMediaRecorder(
    comp: Composition,
    settings: ExportSettings,
    startFrame: number,
    endFrame: number,
    totalFrames: number,
    container: 'mp4' | 'webm',
    wcCodec: WebCodecsCodec,
  ): Promise<void> {
    // Map WebCodecs codec name → MediaRecorder codec name
    const mrCodec =
      wcCodec === 'h264' ? 'h264' :
      wcCodec === 'vp9'  ? 'vp9' :
      wcCodec === 'vp8'  ? 'vp8' : 'auto';

    if (!MediaRecorderEncoder.isSupported(container, mrCodec as any)) {
      // Last resort: try WebM VP8 which is universal
      if (MediaRecorderEncoder.isSupported('webm', 'vp8')) {
        container = 'webm';
      } else {
        throw new Error(
          `${settings.format} not supported by this browser. ` +
          `No encoder available for this format.`,
        );
      }
    }

    const encoder = new MediaRecorderEncoder({
      width: settings.width,
      height: settings.height,
      fps: settings.fps,
      bitrate: settings.bitrate,
      codec: mrCodec as any,
      container,
    });

    this.frameRenderer.beginExport(settings.width, settings.height);
    this.setStatus('preparing');
    await encoder.start();
    this.setStatus('rendering');

    try {
      for (let f = startFrame; f <= endFrame; f++) {
        await this._throttleIfPaused();
        if (this._cancelled) {
          encoder.cancel();
          throw new Error('cancelled');
        }

        const frameStart = performance.now();
        const rendered = await this.frameRenderer.renderFrame(
          comp.id, f, settings.fps,
          settings.width, settings.height,
        );

        this.emit('preview', { bitmap: rendered.bitmap, frameNumber: f });

        await encoder.addFrame(rendered.bitmap);
        rendered.bitmap.close();

        const totalFrameMs = performance.now() - frameStart;
        this._frameTimes.push(totalFrameMs);

        const currentCount = f - startFrame + 1;
        this._emitProgress(currentCount, totalFrames, totalFrameMs);

        if (currentCount % 4 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      this.setStatus('encoding');
      const blob = await encoder.finish();

      if (this._cancelled) throw new Error('cancelled');

      const ext = container === 'mp4' ? 'mp4' : 'webm';
      const saveRes = await saveFile(
        blob, settings.fileName, ext, settings.useSaveDialog, encoder.mime,
      );

      if (saveRes.cancelled) {
        this.setStatus('cancelled');
        this.emit('cancelled');
        return;
      }
      if (!saveRes.saved) {
        throw new Error(saveRes.error ?? 'Failed to save video');
      }

      this.setStatus('done');
      this.emit('done', {
        blob, size: blob.size,
        name: saveRes.path ?? settings.fileName,
        method: saveRes.method,
        frameCount: totalFrames,
      } satisfies ExportDonePayload);
    } catch (err) {
      encoder.cancel();
      throw err;
    }
  }

  // ── GIF export (gifenc, WASM-free) ────────────────────────────────
  private async _exportGif(
    comp: Composition,
    settings: ExportSettings,
  ): Promise<void> {
    const startFrame = Math.max(0, settings.range.startFrame);
    const endFrame = Math.min(
      Math.floor(comp.duration * comp.fps) - 1,
      settings.range.endFrame,
    );
    if (endFrame < startFrame) {
      throw new Error(`Invalid frame range: ${startFrame} to ${endFrame}`);
    }
    const totalFrames = endFrame - startFrame + 1;

    const encoder = new GifExportEncoder({
      width: settings.width,
      height: settings.height,
      fps: settings.fps,
      quality: settings.quality,
      loopCount: settings.gifLoopCount,
    });

    this.frameRenderer.beginExport(settings.width, settings.height);
    this.setStatus('preparing');
    await encoder.start();
    this.setStatus('rendering');

    try {
      for (let f = startFrame; f <= endFrame; f++) {
        await this._throttleIfPaused();
        if (this._cancelled) {
          encoder.cancel();
          throw new Error('cancelled');
        }

        const frameStart = performance.now();
        const rendered = await this.frameRenderer.renderFrame(
          comp.id, f, settings.fps,
          settings.width, settings.height,
        );

        this.emit('preview', { bitmap: rendered.bitmap, frameNumber: f });
        await encoder.addFrame(rendered.bitmap);
        rendered.bitmap.close();

        const totalFrameMs = performance.now() - frameStart;
        this._frameTimes.push(totalFrameMs);
        const currentCount = f - startFrame + 1;
        this._emitProgress(currentCount, totalFrames, totalFrameMs);

        if (currentCount % 4 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      this.setStatus('encoding');
      const blob = await encoder.finish();

      if (this._cancelled) throw new Error('cancelled');

      const saveRes = await saveFile(
        blob, settings.fileName, 'gif', settings.useSaveDialog, 'image/gif',
      );

      if (saveRes.cancelled) {
        this.setStatus('cancelled');
        this.emit('cancelled');
        return;
      }
      if (!saveRes.saved) {
        throw new Error(saveRes.error ?? 'Failed to save GIF');
      }

      this.setStatus('done');
      this.emit('done', {
        blob, size: blob.size,
        name: saveRes.path ?? settings.fileName,
        method: saveRes.method,
        frameCount: totalFrames,
      } satisfies ExportDonePayload);
    } catch (err) {
      encoder.cancel();
      throw err;
    }
  }

  // ── Audio-only export ────────────────────────────────────────────
  private async _exportAudioOnly(
    comp: Composition,
    settings: ExportSettings,
  ): Promise<void> {
    this.setStatus('preparing');
    this.emit('progress', {
      currentFrame: 0, totalFrames: 1, elapsedMs: 0, etaMs: 0,
      avgFrameMs: 0, lastFrameMs: 0,
    });

    const startFrame = Math.max(0, settings.range.startFrame);
    const endFrame = Math.min(
      Math.floor(comp.duration * comp.fps) - 1,
      settings.range.endFrame,
    );

    // 1. Mix
    const mix = await mixCompositionAudio(comp, {
      sampleRate: settings.audioSampleRate,
      channels: settings.audioChannels,
      startFrame,
      endFrame,
      onProgress: (pct, _msg) => {
        this.emit('progress', {
          currentFrame: Math.round(pct * 100),
          totalFrames: 100,
          elapsedMs: performance.now() - this._startTime,
          etaMs: 0, avgFrameMs: 0, lastFrameMs: 0,
        });
        // status stays "preparing" during mix
      },
    });

    if (!mix) {
      // Silent output — produce a silent buffer of the requested duration
      const totalSamples = Math.ceil(
        ((endFrame - startFrame + 1) / comp.fps) * settings.audioSampleRate,
      );
      const silentCtx = new OfflineAudioContext(
        settings.audioChannels, totalSamples, settings.audioSampleRate,
      );
      const silentBuf = await silentCtx.startRendering();
      await this._encodeAndSaveAudio(silentBuf, settings);
      return;
    }

    if (this._cancelled) throw new Error('cancelled');

    // 2. Encode + save
    await this._encodeAndSaveAudio(mix.buffer, settings);
  }

  private async _encodeAndSaveAudio(
    buffer: AudioBuffer,
    settings: ExportSettings,
  ): Promise<void> {
    this.setStatus('encoding');
    let blob: Blob;
    let ext: string;
    let mime: string;

    try {
      switch (settings.format) {
        case 'audio-wav': {
          blob = encodeWav(buffer);
          ext = 'wav'; mime = 'audio/wav';
          break;
        }
        case 'audio-mp3': {
          blob = encodeMp3(buffer, {
            bitrate: settings.audioBitrate,
            channels: settings.audioChannels,
            sampleRate: settings.audioSampleRate,
          });
          ext = 'mp3'; mime = 'audio/mpeg';
          break;
        }
        case 'audio-aac':
        case 'audio-opus': {
          const codec: WebCodecsAudioCodec = settings.format === 'audio-aac' ? 'aac' : 'opus';
          const result = await encodeWithWebCodecs(buffer, codec, {
            sampleRate: settings.audioSampleRate,
            channels: settings.audioChannels,
            bitrate: settings.audioBitrate,
          });
          // Wrap raw chunks in a container.
          if (codec === 'aac') {
            const mp4Muxer = await import('mp4-muxer');
            const target = new mp4Muxer.ArrayBufferTarget();
            const muxer = new mp4Muxer.Muxer({
              target,
              audio: {
                codec: 'aac',
                sampleRate: settings.audioSampleRate,
                numberOfChannels: settings.audioChannels,
              },
              fastStart: 'in-memory',
              firstTimestampBehavior: 'offset',
            });
            for (const { chunk, meta } of result.chunks) muxer.addAudioChunk(chunk, meta);
            muxer.finalize();
            blob = new Blob([target.buffer], { type: 'audio/mp4' });
            ext = 'm4a'; mime = 'audio/mp4';
          } else {
            const webmMuxer = await import('webm-muxer');
            const target = new webmMuxer.ArrayBufferTarget();
            const muxer = new webmMuxer.Muxer({
              target,
              audio: {
                codec: 'A_OPUS',
                sampleRate: settings.audioSampleRate,
                numberOfChannels: settings.audioChannels,
              },
              firstTimestampBehavior: 'offset',
            });
            for (const { chunk, meta } of result.chunks) muxer.addAudioChunk(chunk, meta);
            muxer.finalize();
            blob = new Blob([target.buffer], { type: 'audio/webm' });
            ext = 'webm'; mime = 'audio/webm';
          }
          break;
        }
        default:
          throw new Error(`Unsupported audio format: ${settings.format}`);
      }
    } catch (err: any) {
      throw new Error(`Audio encoding failed: ${err?.message ?? err}`);
    }

    if (this._cancelled) throw new Error('cancelled');

    const saveRes = await saveFile(blob, settings.fileName, ext, settings.useSaveDialog, mime);

    if (saveRes.cancelled) {
      this.setStatus('cancelled');
      this.emit('cancelled');
      return;
    }
    if (!saveRes.saved) {
      throw new Error(saveRes.error ?? 'Failed to save audio');
    }

    this.setStatus('done');
    this.emit('done', {
      blob, size: blob.size,
      name: saveRes.path ?? settings.fileName,
      method: saveRes.method,
    } satisfies ExportDonePayload);
  }

  dispose(): void {
    this.handlers.clear();
  }
}

// ── Singleton ───────────────────────────────────────────────────────

let _engine: ExportEngine | null = null;
export function getExportEngine(): ExportEngine | null {
  if (_engine) return _engine;
  const r = (window as any).__renderer as Renderer | undefined;
  if (!r) return null;
  _engine = new ExportEngine(r);
  return _engine;
}