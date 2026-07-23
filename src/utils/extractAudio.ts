/**
 * extractAudio — mix + encode audio from a single layer, then either import
 * as a project asset or save to disk based on user choice.
 */
import type { Layer } from '../types/layer';
import type { Composition } from '../types/composition';
import { mixCompositionAudio } from '../renderer/export/AudioMixer';
import { encodeMp3 } from '../renderer/export/Mp3Encoder';
import { encodeWav, encodeWithWebCodecs } from '../renderer/export/AudioEncoders';
import { saveFile } from '../renderer/export/FileSaver';
import { assetManager } from '../storage/AssetManager';
import { useProjectStore } from '../state/projectStore';
import { useNotificationStore } from '../state/notificationStore';

export type ExtractFormat = 'mp3' | 'wav' | 'aac' | 'opus';
export type ExtractDestination = 'project-asset' | 'file';

export interface ExtractAudioOptions {
  layer: Layer;
  comp: Composition;
  format: ExtractFormat;
  bitrate: number;      // kbps
  sampleRate: number;   // Hz
  channels: 1 | 2;
  destination: ExtractDestination;
  fileName: string;
}

export interface ExtractAudioResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
  assetId?: string;   // when destination === 'project-asset'
  path?: string;      // when destination === 'file'
}

export async function extractAudioFromLayer(
  opts: ExtractAudioOptions,
): Promise<ExtractAudioResult> {
  // 1. Mix (single-layer)
  let mix;
  try {
    mix = await mixCompositionAudio(opts.comp, {
      sampleRate: opts.sampleRate,
      channels: opts.channels,
      onlyLayerId: opts.layer.id,
    });
  } catch (err: any) {
    return { ok: false, error: `Mix failed: ${err?.message ?? err}` };
  }
  if (!mix) {
    return { ok: false, error: 'No audio content found in this layer' };
  }

  // 2. Encode
  let blob: Blob;
  let ext: string;
  let mime: string;
  try {
    switch (opts.format) {
      case 'wav':
        blob = encodeWav(mix.buffer);
        ext = 'wav'; mime = 'audio/wav';
        break;
      case 'mp3':
        blob = encodeMp3(mix.buffer, {
          bitrate: opts.bitrate,
          channels: opts.channels,
          sampleRate: opts.sampleRate,
        });
        ext = 'mp3'; mime = 'audio/mpeg';
        break;
      case 'aac':
      case 'opus': {
        const result = await encodeWithWebCodecs(mix.buffer, opts.format, {
          sampleRate: opts.sampleRate,
          channels: opts.channels,
          bitrate: opts.bitrate,
        });
        if (opts.format === 'aac') {
          const mp4Muxer = await import('mp4-muxer');
          const target = new mp4Muxer.ArrayBufferTarget();
          const muxer = new mp4Muxer.Muxer({
            target,
            audio: {
              codec: 'aac',
              sampleRate: opts.sampleRate,
              numberOfChannels: opts.channels,
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
              sampleRate: opts.sampleRate,
              numberOfChannels: opts.channels,
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
        return { ok: false, error: `Unknown format: ${opts.format}` };
    }
  } catch (err: any) {
    return { ok: false, error: `Encode failed: ${err?.message ?? err}` };
  }

  const finalName = opts.fileName.endsWith(`.${ext}`) ? opts.fileName : `${opts.fileName}.${ext}`;

  // 3. Destination
  if (opts.destination === 'project-asset') {
    // Import as project asset
    try {
      const file = new File([blob], finalName, { type: mime });
      const asset = await assetManager.importFile(file);
      // Also register in projectStore so it shows in the Project panel
      useProjectStore.getState().addAsset({
        id: asset.id,
        name: asset.name,
        type: 'audio',
        path: asset.url,
        size: asset.size,
        mimeType: mime,
        importedAt: Date.now(),
        duration: mix.durationSec,
      } as any);
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: `Extracted "${finalName}" to project library`,
        autoDismiss: 3000,
      });
      return { ok: true, assetId: asset.id };
    } catch (err: any) {
      return { ok: false, error: `Import failed: ${err?.message ?? err}` };
    }
  }

  // Save to file
  const saveRes = await saveFile(blob, opts.fileName, ext, true, mime);
  if (saveRes.cancelled) return { ok: false, cancelled: true };
  if (!saveRes.saved) return { ok: false, error: saveRes.error ?? 'Save failed' };
  useNotificationStore.getState().addNotification({
    type: 'success',
    message: `Saved audio "${saveRes.path ?? finalName}"`,
    autoDismiss: 3000,
  });
  return { ok: true, path: saveRes.path };
}