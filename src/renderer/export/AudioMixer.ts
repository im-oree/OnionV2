/**
 * AudioMixer — renders composition audio to a single AudioBuffer using
 * OfflineAudioContext (faster than real-time, browser-native).
 *
 * Supports:
 *   - Audio layers (via layer.data.assetId)
 *   - Video layers (extracts audio track from the video asset)
 *   - Per-layer volume + mute
 *   - Per-layer volume keyframes (via PropertyBinder / KeyframeEngine)
 *   - Layer timing (startFrame/endFrame trims/positions each source)
 *   - Comp-relative frame range for exports of partial durations
 *
 * NOT included in v1:
 *   - Time remapping on audio (audio plays at natural rate)
 *   - Nested comp audio recursion (comp layers have their audio skipped
 *     unless the source comp has already been extracted or exported)
 *   - Master volume, panning, audio effects
 */
import type { Composition } from '../../types/composition';
import type { Layer, AudioData, VideoData } from '../../types/layer';
import { assetManager } from '../../storage/AssetManager';
import { useProjectStore } from '../../state/projectStore';
import { useKeyframeStore } from '../../state/keyframeStore';

export interface AudioMixerOptions {
  sampleRate: number;    // 22050 | 44100 | 48000 | 96000
  channels: 1 | 2;
  /** Composition-frame range to mix. If omitted, mixes the full comp. */
  startFrame?: number;
  endFrame?: number;
  /** Called with 0-1 progress during buffer decoding + rendering. Optional. */
  onProgress?: (pct: number, msg: string) => void;
  /** If true, only include the layer with this id (used by extract). */
  onlyLayerId?: string;
}

export interface MixerResult {
  buffer: AudioBuffer;
  durationSec: number;
  channels: number;
  sampleRate: number;
}

/** Cache of decoded audio buffers keyed by asset URL (avoid re-decode) */
const _decodeCache = new Map<string, AudioBuffer>();

/**
 * Mix comp audio to a single AudioBuffer. Returns null if there is nothing
 * to mix (no audio-producing layers in range).
 */
export async function mixCompositionAudio(
  comp: Composition,
  opts: AudioMixerOptions,
): Promise<MixerResult | null> {
  const sampleRate = opts.sampleRate;
  const channels = opts.channels;
  const fps = comp.fps;

  const startFrame = Math.max(0, opts.startFrame ?? 0);
  const endFrame = Math.min(
    Math.floor(comp.duration * fps) - 1,
    opts.endFrame ?? Math.floor(comp.duration * fps) - 1,
  );
  if (endFrame < startFrame) return null;

  const startSec = startFrame / fps;
  const endSec = (endFrame + 1) / fps;
  const durationSec = endSec - startSec;
  if (durationSec <= 0) return null;

  // Collect audio-bearing layers within the range
  const audioLayers = comp.layers.filter((l) => {
    if (opts.onlyLayerId && l.id !== opts.onlyLayerId) return false;
    if (l.visible === false) return false;
    if (l.type !== 'audio' && l.type !== 'video') return false;
    // Skip fully-out-of-range layers
    const lStart = l.startFrame / fps;
    const lEnd = l.endFrame / fps;
    return lEnd > startSec && lStart < endSec;
  });

  if (audioLayers.length === 0) {
    opts.onProgress?.(1, 'No audio sources');
    return null;
  }

  // ── Resolve + decode all source buffers first (may be slow for video) ──
  opts.onProgress?.(0, 'Decoding sources');
  const sources = await _resolveAndDecodeSources(audioLayers, sampleRate, channels, opts.onProgress);

  if (sources.length === 0) {
    opts.onProgress?.(1, 'No decodable sources');
    return null;
  }

  // ── Create OfflineAudioContext ─────────────────────────────────
  const totalSamples = Math.ceil(durationSec * sampleRate);
  const offlineCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);

  // ── Schedule each source ───────────────────────────────────────
  for (const src of sources) {
    _scheduleSource(offlineCtx, src, startSec, endSec, sampleRate);
  }

  opts.onProgress?.(0.5, 'Rendering mix');
  const buffer = await offlineCtx.startRendering();
  opts.onProgress?.(1, 'Mix complete');

  return {
    buffer,
    durationSec,
    channels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  };
}

// ── Internal ─────────────────────────────────────────────────────

interface DecodedSource {
  layer: Layer;
  buffer: AudioBuffer;
  layerStartSec: number;
  layerEndSec: number;
  layerVolume: number;
  layerMuted: boolean;
  playbackRate: number;
  volumeKeyframes: Array<{ timeSec: number; value: number }> | null;
}

async function _resolveAndDecodeSources(
  layers: Layer[],
  sampleRate: number,
  channels: number,
  onProgress?: (pct: number, msg: string) => void,
): Promise<DecodedSource[]> {
  const out: DecodedSource[] = [];
  const decodeCtx = new OfflineAudioContext(channels, 1, sampleRate);
  const kfEngine = useKeyframeStore.getState().engine;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    onProgress?.(0.05 + (i / layers.length) * 0.4, `Decoding ${layer.name}`);
    const url = _getLayerAudioUrl(layer);
    if (!url) continue;

    let buffer: AudioBuffer | null = null;
    if (_decodeCache.has(url)) {
      buffer = _decodeCache.get(url)!;
    } else {
      try {
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        buffer = await decodeCtx.decodeAudioData(arrayBuffer);
        _decodeCache.set(url, buffer);
      } catch (err) {
        console.warn(`[AudioMixer] Failed to decode audio for layer ${layer.name}:`, err);
        continue;
      }
    }

    const data = layer.data as (AudioData | VideoData);
    const rawVol = (data as any)?.volume;
    let layerVolume = typeof rawVol === 'number' && isFinite(rawVol) ? rawVol : 1;
    if (layerVolume > 1) layerVolume = layerVolume / 100;
    const layerMuted = !!(data as any)?.muted;
    const playbackRate = (data as any)?.playbackRate ?? 1;

    // Volume keyframes (in local layer frames)
    const kfs = kfEngine.getKeyframesForProperty(layer.id, 'volume');
    let volumeKeyframes: Array<{ timeSec: number; value: number }> | null = null;
    if (kfs.length > 0) {
      const fps = _fpsForLayer(layer);
      volumeKeyframes = kfs.map((k) => {
        // local frame → composition-relative seconds
        const absFrame = k.time + layer.startFrame;
        const timeSec = absFrame / fps;
        let v = typeof k.value === 'number' ? k.value : layerVolume;
        if (v > 1) v = v / 100;
        return { timeSec, value: Math.max(0, Math.min(2, v)) };
      });
    }

    out.push({
      layer,
      buffer,
      layerStartSec: layer.startFrame / _fpsForLayer(layer),
      layerEndSec: (layer.endFrame + 1) / _fpsForLayer(layer),
      layerVolume,
      layerMuted,
      playbackRate,
      volumeKeyframes,
    });
  }

  return out;
}

function _scheduleSource(
  ctx: OfflineAudioContext,
  src: DecodedSource,
  mixStartSec: number,
  mixEndSec: number,
  _sampleRate: number,
): void {
  const source = ctx.createBufferSource();
  source.buffer = src.buffer;
  source.playbackRate.value = src.playbackRate;

  const gain = ctx.createGain();
  const baseGain = src.layerMuted ? 0 : src.layerVolume;

  if (src.volumeKeyframes && src.volumeKeyframes.length > 0) {
    // Build automation curve on the gain node, relative to context time
    // Context time 0 corresponds to mixStartSec in composition time.
    gain.gain.setValueAtTime(baseGain, 0);
    for (const kf of src.volumeKeyframes) {
      const t = kf.timeSec - mixStartSec;
      if (t < 0) {
        // Set initial value from pre-range keyframe
        gain.gain.setValueAtTime(src.layerMuted ? 0 : kf.value, 0);
      } else if (t <= (mixEndSec - mixStartSec)) {
        gain.gain.linearRampToValueAtTime(src.layerMuted ? 0 : kf.value, t);
      }
    }
  } else {
    gain.gain.value = baseGain;
  }

  source.connect(gain).connect(ctx.destination);

  // ── Schedule start / stop ────────────────────────────────────
  // Where in the mix does this layer start playing?
  const layerRelStart = src.layerStartSec - mixStartSec;
  const layerRelEnd = src.layerEndSec - mixStartSec;

  const mixDuration = mixEndSec - mixStartSec;

  // Context start time (never negative — clamp and use offset instead)
  const ctxStart = Math.max(0, layerRelStart);
  const bufOffset = layerRelStart < 0 ? -layerRelStart * src.playbackRate : 0;
  const bufDuration = Math.min(
    src.buffer.duration - bufOffset,
    (layerRelEnd - ctxStart) * src.playbackRate,
    (mixDuration - ctxStart) * src.playbackRate,
  );

  if (bufDuration <= 0 || bufOffset >= src.buffer.duration) return;

  try {
    source.start(ctxStart, bufOffset, bufDuration);
  } catch (err) {
    console.warn(`[AudioMixer] Failed to schedule ${src.layer.name}:`, err);
  }
}

function _getLayerAudioUrl(layer: Layer): string | null {
  const assetId = (layer.data as any)?.assetId;
  if (!assetId) return null;
  const fromManager = assetManager.getAsset(assetId);
  if (fromManager?.url) return fromManager.url;
  const pa = useProjectStore.getState().project.assets.find(a => a.id === assetId);
  return pa?.path ?? null;
}

function _fpsForLayer(_layer: Layer): number {
  // Layers use comp fps for start/end frame math
  // (we don't have a per-layer fps override in this codebase)
  const compState = (window as any).__compositionStore?.getState?.();
  const compId = compState?.activeCompositionId;
  const comp = compId ? compState.compositions.find((c: any) => c.id === compId) : null;
  return comp?.fps ?? 30;
}

/** Check if a layer has audio content — used to gate the Extract UI. */
export function layerHasAudio(layer: Layer): boolean {
  if (layer.type === 'audio' && (layer.data as any)?.assetId) return true;
  if (layer.type === 'video' && (layer.data as any)?.assetId) return true;
  if (layer.type === 'comp' && (layer.data as any)?.sourceCompId) {
    // Nested comp — check if source has audio layers
    const compState = (window as any).__compositionStore?.getState?.();
    const sourceComp = compState?.compositions.find((c: any) => c.id === (layer.data as any).sourceCompId);
    if (!sourceComp) return false;
    return sourceComp.layers.some((l: Layer) => layerHasAudio(l));
  }
  return false;
}

/** Clear the decode cache — call when a project unloads. */
export function clearAudioDecodeCache(): void {
  _decodeCache.clear();
}