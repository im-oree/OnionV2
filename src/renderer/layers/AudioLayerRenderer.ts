/**
 * AudioLayerRenderer — manages audio playback with Web Audio API pipeline
 * for volume, pan, and fade envelope control.
 *
 * Pipeline: HTMLAudioElement → MediaElementSource → GainNode → StereoPannerNode → destination
 */
import type { Layer, AudioData, FadeCurve } from '../../types/layer';
import { getActiveSegment } from '../../types/layer';
import { assetManager } from '../../storage/AssetManager';
import { useProjectStore } from '../../state/projectStore';
import { computeFadeEnvelope } from '../audio/audioEnvelope';

/** Shared AudioContext across all audio layers */
let _sharedCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!_sharedCtx) {
    _sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _sharedCtx;
}

/** Global unlock handler for autoplay policy */
const pendingUnlock = new Set<HTMLAudioElement>();
let unlockHandlerInstalled = false;

function installUnlockHandler(): void {
  if (unlockHandlerInstalled) return;
  unlockHandlerInstalled = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    for (const a of pendingUnlock) {
      const wasMuted = a.muted;
      a.muted = true;
      a.play().then(() => {
        a.pause();
        a.muted = wasMuted;
      }).catch(() => { a.muted = wasMuted; });
    }
    pendingUnlock.clear();
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('click', unlock, { capture: true });
}

export class AudioLayerRenderer {
  readonly id: string;
  private _audio: HTMLAudioElement | null = null;
  private _source: MediaElementAudioSourceNode | null = null;
  private _gainNode: GainNode | null = null;
  private _panNode: StereoPannerNode | null = null;
  private _assetId: string = '';
  private _disposed = false;
  private _ready = false;
  private _wasPlayingWhenLoaded = false;
  private _lastKnownLocalTime = 0;
  private _loggedLoad = false;

  constructor(id: string) {
    this.id = id;
    installUnlockHandler();
  }

  /** Called by Renderer._syncAudioLayers every frame. */
  sync(layer: Layer, currentTime: number, compFps: number, isPlaying: boolean): void {
    if (this._disposed) return;
    const data = layer.data as AudioData | undefined;
    if (!data || !data.assetId) return;

    // Segment-aware audio
    const currentFrame = Math.floor(currentTime * compFps);
    const activeSeg = getActiveSegment(layer, currentFrame);

    if (!activeSeg) {
      // Outside all segments — pause and skip
      this._wasPlayingWhenLoaded = false;
      if (this._audio && !this._audio.paused) this._audio.pause();
      if (data.assetId !== this._assetId) this._loadAudio(data.assetId, layer);
      return;
    }

    const segStartSec = activeSeg.startFrame / compFps;
    const segEndSec = activeSeg.endFrame / compFps;
    const inRange = currentTime >= segStartSec && currentTime <= segEndSec;
    const localTime = Math.max(0,
      (currentTime - segStartSec) + (activeSeg.sourceOffset / compFps),
    );
    this._lastKnownLocalTime = localTime;

    if (data.assetId !== this._assetId) {
      this._loadAudio(data.assetId, layer);
    }

    const audio = this._audio;
    if (!audio) return;

    // ── Compute effective volume: base * fade envelope ──
    let baseVolume = (typeof data.volume === 'number' && isFinite(data.volume)) ? data.volume : 1;
    if (baseVolume > 1) baseVolume /= 100;
    baseVolume = Math.max(0, Math.min(1, baseVolume));

    const envelope = computeFadeEnvelope(
      currentTime,
      segStartSec,
      segEndSec,
      data.fadeIn ?? 0,
      data.fadeOut ?? 0,
      data.fadeInCurve ?? 'linear',
      data.fadeOutCurve ?? 'linear',
      data.fadeInBezier,
      data.fadeOutBezier,
    );
    const effectiveVolume = baseVolume * envelope;

    // Apply via Web Audio gain node if available, else fall back to element volume
    if (this._gainNode) {
      this._gainNode.gain.value = effectiveVolume;
    } else {
      audio.volume = effectiveVolume;
    }

    // ── Apply pan (-1..+1) ──
    const pan = Math.max(-1, Math.min(1, data.pan ?? 0));
    if (this._panNode) {
      this._panNode.pan.value = pan;
    }

    audio.muted = !!data.muted;
    const rate = data.playbackRate;
    const safeRate = (typeof rate === 'number' && isFinite(rate) && rate > 0) ? rate : 1;
    if (audio.playbackRate !== safeRate) audio.playbackRate = safeRate;

    // Play / pause / seek
    if (isPlaying && inRange) {
      if (this._ready) {
        if (audio.paused) {
          if (Math.abs(audio.currentTime - localTime) > 0.05) {
            audio.currentTime = localTime;
          }
          const p = audio.play();
          if (p && typeof p.catch === 'function') {
            p.catch((err) => {
              if (err?.name === 'NotAllowedError') {
                this._wasPlayingWhenLoaded = true;
                pendingUnlock.add(audio);
                console.warn('[AudioLayer] Autoplay blocked — will start after next user gesture');
              } else {
                console.warn('[AudioLayer] Play failed:', err?.message ?? err);
              }
            });
          }
        } else {
          const drift = Math.abs(audio.currentTime - localTime);
          if (drift > 0.15) audio.currentTime = localTime;
        }
      } else {
        this._wasPlayingWhenLoaded = true;
      }
    } else {
      this._wasPlayingWhenLoaded = false;
      if (!audio.paused) audio.pause();
      if (inRange && Math.abs(audio.currentTime - localTime) > 0.01) {
        try { audio.currentTime = localTime; } catch {}
      }
    }
  }

  pause(): void {
    this._wasPlayingWhenLoaded = false;
    if (this._audio && !this._audio.paused) this._audio.pause();
  }

  dispose(): void {
    this._disposed = true;
    this._wasPlayingWhenLoaded = false;
    this._teardownAudioGraph();
    if (this._audio) {
      pendingUnlock.delete(this._audio);
      this._audio.pause();
      this._audio.removeAttribute('src');
      this._audio.load();
      this._audio = null;
    }
  }

  private _teardownAudioGraph(): void {
    try { this._panNode?.disconnect(); } catch {}
    try { this._gainNode?.disconnect(); } catch {}
    try { this._source?.disconnect(); } catch {}
    this._panNode = null;
    this._gainNode = null;
    this._source = null;
  }

  private _loadAudio(assetId: string, layer: Layer): void {
    this._assetId = assetId;
    this._ready = false;
    this._loggedLoad = false;
    this._teardownAudioGraph();

    if (this._audio) {
      pendingUnlock.delete(this._audio);
      this._audio.pause();
      this._audio.removeAttribute('src');
      this._audio.load();
      this._audio = null;
    }

    let url: string | null = null;
    const fromManager = assetManager.getAsset(assetId);
    if (fromManager?.url) url = fromManager.url;
    if (!url) {
      const pa = useProjectStore.getState().project.assets.find(a => a.id === assetId);
      if (pa?.path) url = pa.path;
    }

    if (!url) {
      if (!this._loggedLoad) {
        console.warn(`[AudioLayer] Asset not found for ID: ${assetId}`);
        this._loggedLoad = true;
      }
      return;
    }

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    const onReady = () => {
      if (this._ready || this._disposed) return;
      this._ready = true;

      // Set up Web Audio graph now that audio is ready
      try {
        const ctx = getAudioContext();
        // MediaElementSource can only be created once per element — if it
        // fails we fall back to plain HTMLAudioElement.volume
        this._source = ctx.createMediaElementSource(audio);
        this._gainNode = ctx.createGain();
        this._panNode = ctx.createStereoPanner();
        this._source.connect(this._gainNode);
        this._gainNode.connect(this._panNode);
        this._panNode.connect(ctx.destination);
      } catch (err) {
        console.warn('[AudioLayer] Web Audio setup failed, using element volume:', err);
        this._teardownAudioGraph();
      }

      if (this._wasPlayingWhenLoaded) {
        try { audio.currentTime = this._lastKnownLocalTime; } catch {}
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch((err) => {
            if (err?.name === 'NotAllowedError') {
              pendingUnlock.add(audio);
            }
          });
        }
      }
    };

    audio.addEventListener('canplay', onReady);
    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('loadeddata', onReady);

    audio.onerror = () => {
      const e = audio.error;
      console.warn(
        `[AudioLayer] Failed to load audio: ${assetId} url=${url}`,
        e ? `code=${e.code} msg=${e.message}` : '',
      );
    };

    audio.src = url;
    audio.load();
    pendingUnlock.add(audio);
    this._audio = audio;
  }
}