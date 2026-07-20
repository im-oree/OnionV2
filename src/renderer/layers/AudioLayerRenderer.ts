/**
 * AudioLayerRenderer — manages HTMLAudioElement playback for audio layers.
 * Audio layers have no visual representation in the viewport; they only play sound.
 */
import type { Layer } from '../../types/layer';
import type { AudioData } from '../../types/layer';
import { assetManager } from '../../storage/AssetManager';
import { useProjectStore } from '../../state/projectStore';

/** Global set of audio elements that need to be unlocked on next user gesture. */
const pendingUnlock = new Set<HTMLAudioElement>();
let unlockHandlerInstalled = false;

function installUnlockHandler(): void {
  if (unlockHandlerInstalled) return;
  unlockHandlerInstalled = true;
  const unlock = () => {
    // "Prime" every pending audio element by calling play()+pause() inside
    // this real user-gesture callback. Subsequent programmatic play() calls
    // will then be allowed by the browser.
    for (const a of pendingUnlock) {
      const wasMuted = a.muted;
      a.muted = true;
      a.play().then(() => {
        a.pause();
        a.muted = wasMuted;
      }).catch(() => {
        a.muted = wasMuted;
      });
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
  private _assetId: string = '';
  private _disposed = false;
  private _ready = false;
  private _wasPlayingWhenLoaded = false;
  private _lastKnownLocalTime = 0;
  private _loggedLoad = false;
  private _unlocked = false;

  constructor(id: string) {
    this.id = id;
    installUnlockHandler();
  }

  /** Called by Renderer._syncAudioLayers every frame. */
  sync(layer: Layer, currentTime: number, compFps: number, isPlaying: boolean): void {
    if (this._disposed) return;
    const data = layer.data as AudioData | undefined;
    if (!data || !data.assetId) return;

    const layerStartSec = layer.startFrame / compFps;
    const layerEndSec = layer.endFrame / compFps;
    const inRange = currentTime >= layerStartSec && currentTime <= layerEndSec;
    const localTime = Math.max(0, currentTime - layerStartSec);
    this._lastKnownLocalTime = localTime;

    if (data.assetId !== this._assetId) {
      this._loadAudio(data.assetId, layer);
    }

    const audio = this._audio;
    if (!audio) return;

    // Support keyframed volume (0-100 scale from keyframes, 0-1 for audio element)
    const rawVol = data.volume;
    let volume = (typeof rawVol === 'number' && isFinite(rawVol)) ? rawVol : 1;
    // If volume is > 1, assume it's in 0-100 percentage scale and normalize
    if (volume > 1) volume = volume / 100;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.muted = !!data.muted;
    const rate = data.playbackRate;
    const safeRate = (typeof rate === 'number' && isFinite(rate) && rate > 0) ? rate : 1;
    if (audio.playbackRate !== safeRate) audio.playbackRate = safeRate;

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
                // Autoplay blocked. Queue for unlock on next gesture,
                // and remember we WANT to be playing so we resume then.
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
        // Not loaded yet — remember to play when canplay fires.
        this._wasPlayingWhenLoaded = true;
      }
    } else {
      // Not playing, or scrubbed outside layer range → pause.
      this._wasPlayingWhenLoaded = false;
      if (!audio.paused) audio.pause();
      if (inRange && Math.abs(audio.currentTime - localTime) > 0.01) {
        // Only re-seek when inside range; otherwise leave the element alone.
        try { audio.currentTime = localTime; } catch { /* seek errors when not ready */ }
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
    if (this._audio) {
      pendingUnlock.delete(this._audio);
      this._audio.pause();
      this._audio.removeAttribute('src');
      this._audio.load();
      this._audio = null;
    }
  }

  private _loadAudio(assetId: string, layer: Layer): void {
    this._assetId = assetId;
    this._ready = false;
    // NOTE: do NOT reset _wasPlayingWhenLoaded here — the sync() call that
    // triggered this load may set it right after we return.
    this._loggedLoad = false;
    this._unlocked = false;

    if (this._audio) {
      pendingUnlock.delete(this._audio);
      this._audio.pause();
      this._audio.removeAttribute('src');
      this._audio.load();
      this._audio = null;
    }

    // Resolve asset URL directly from both stores
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
      console.log(`[AudioLayer] Audio loaded and ready: ${layer.name} (${assetId}) dur=${audio.duration}`);
      if (this._wasPlayingWhenLoaded) {
        try { audio.currentTime = this._lastKnownLocalTime; } catch { /* ignore */ }
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch((err) => {
            if (err?.name === 'NotAllowedError') {
              pendingUnlock.add(audio);
              console.warn('[AudioLayer] Deferred play blocked by autoplay policy — will start on next user gesture');
            } else {
              console.warn('[AudioLayer] Deferred play failed:', err?.message ?? err);
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
    // Pre-register for unlock so the FIRST user gesture (usually the Play
    // click that got us here) primes this element too.
    pendingUnlock.add(audio);
    this._audio = audio;
  }
}