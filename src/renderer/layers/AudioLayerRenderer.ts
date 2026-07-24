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
import { getAudioContext, registerForUnlock, unregisterForUnlock, installUnlockHandler } from '../audio/audioContext';
import { createAudioEffect, type EffectNode } from '../audio/audioEffects';
import type { AudioEffectInstance, AudioEQ } from '../../types/layer';


export class AudioLayerRenderer {
  readonly id: string;
  private _audio: HTMLAudioElement | null = null;
  private _source: MediaElementAudioSourceNode | null = null;
  private _gainNode: GainNode | null = null;
  private _panNode: StereoPannerNode | null = null;
  private _spatialNode: PannerNode | null = null;
  private _lastSpatialHash = '';
  private _effectsInput: GainNode | null = null;
  private _effectsOutput: GainNode | null = null;
  private _eqInput: GainNode | null = null;
  private _eqOutput: GainNode | null = null;
  private _activeEffects: Array<{ instanceId: string; node: EffectNode }> = [];
  private _activeEQBands: BiquadFilterNode[] = [];
  private _lastEffectsHash = '';
  private _lastEQHash = '';
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

    // ── Update effects chain + EQ if changed ──
    this._syncEffectsChain(data);
    this._syncEQ(data);
    this._syncSpatial(data);

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
                registerForUnlock(audio);
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
      unregisterForUnlock(this._audio);
      this._audio.pause();
      this._audio.removeAttribute('src');
      this._audio.load();
      this._audio = null;
    }
  }

  private _teardownAudioGraph(): void {
    // Dispose active effects
    for (const { node } of this._activeEffects) node.dispose();
    this._activeEffects = [];
    // Disconnect EQ bands
    for (const b of this._activeEQBands) { try { b.disconnect(); } catch {} }
    this._activeEQBands = [];
    // Disconnect graph nodes in order
    try { this._spatialNode?.disconnect(); } catch {}
    this._spatialNode = null;
    this._lastSpatialHash = '';
    try { this._eqOutput?.disconnect(); } catch {}
    try { this._eqInput?.disconnect(); } catch {}
    try { this._effectsOutput?.disconnect(); } catch {}
    try { this._effectsInput?.disconnect(); } catch {}
    try { this._panNode?.disconnect(); } catch {}
    try { this._gainNode?.disconnect(); } catch {}
    try { this._source?.disconnect(); } catch {}
    this._eqOutput = null;
    this._eqInput = null;
    this._effectsOutput = null;
    this._effectsInput = null;
    this._panNode = null;
    this._gainNode = null;
    this._source = null;
    this._lastEffectsHash = '';
    this._lastEQHash = '';
  }

  // ── Effects chain ───────────────────────────────────────────

  private _syncEffectsChain(data: AudioData): void {
    if (!this._effectsInput || !this._effectsOutput) return;
    const effects = (data.audioEffects ?? []) as AudioEffectInstance[];
    const enabledEffects = effects.filter(e => e.enabled !== false);
    const hash = JSON.stringify(
      enabledEffects.map(e => ({ id: e.id, type: e.baseType, params: e.params, mix: e.mix })),
    );
    if (hash === this._lastEffectsHash) return;
    this._lastEffectsHash = hash;

    // Rebuild chain from scratch (cheap for small chains)
    for (const { node } of this._activeEffects) node.dispose();
    this._activeEffects = [];

    try { this._effectsInput.disconnect(); } catch {}

    if (enabledEffects.length === 0) {
      // Bypass — connect input directly to output
      this._effectsInput.connect(this._effectsOutput);
      return;
    }

    const ctx = getAudioContext();
    let prevOutput: AudioNode = this._effectsInput;
    for (const fx of enabledEffects) {
      const node = createAudioEffect(ctx, fx.baseType, fx.params);
      node.setMix(fx.mix ?? 1);
      prevOutput.connect(node.input);
      prevOutput = node.output;
      this._activeEffects.push({ instanceId: fx.id, node });
    }
    prevOutput.connect(this._effectsOutput);
  }

  // ── EQ chain ───────────────────────────────────────────────

  private _syncEQ(data: AudioData): void {
    if (!this._eqInput || !this._eqOutput) return;
    const eq = data.eq as AudioEQ | undefined;
    const enabled = eq?.enabled !== false && eq && eq.bands && eq.bands.length > 0;
    const hash = JSON.stringify(enabled ? eq!.bands : []);
    if (hash === this._lastEQHash) return;
    this._lastEQHash = hash;

    // Rebuild EQ
    for (const b of this._activeEQBands) { try { b.disconnect(); } catch {} }
    this._activeEQBands = [];
    try { this._eqInput.disconnect(); } catch {}

    if (!enabled) {
      this._eqInput.connect(this._eqOutput);
      return;
    }

    const ctx = getAudioContext();
    let prev: AudioNode = this._eqInput;
    for (const band of eq!.bands) {
      const filter = ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      prev.connect(filter);
      prev = filter;
      this._activeEQBands.push(filter);
    }
    prev.connect(this._eqOutput);
  }

  // ── Spatial audio ──────────────────────────────────────────

  private _syncSpatial(data: AudioData): void {
    if (!this._eqOutput) return;

    import('../audio/spatialAudio').then(({ readSpatialFromData, applyLinkedLayerPosition, createSpatialNode, applySpatialConfig }) => {
      let config = readSpatialFromData(data);
      if (config) {
        config = applyLinkedLayerPosition(config, (data as any).spatialLinkedLayerId);
      }

      const enabled = !!config;
      const hash = enabled
        ? JSON.stringify({ ...config, linked: (data as any).spatialLinkedLayerId })
        : 'off';
      if (hash === this._lastSpatialHash) return;
      this._lastSpatialHash = hash;

      const ctx = (this._eqOutput!.context as AudioContext);

      if (!enabled) {
        if (this._spatialNode) {
          try { this._eqOutput!.disconnect(); } catch {}
          try { this._spatialNode.disconnect(); } catch {}
          this._spatialNode = null;
        }
        try { this._eqOutput!.disconnect(); } catch {}
        this._eqOutput!.connect(ctx.destination);
        return;
      }

      if (!this._spatialNode) {
        this._spatialNode = createSpatialNode(config!);
        try { this._eqOutput!.disconnect(); } catch {}
        this._eqOutput!.connect(this._spatialNode);
        this._spatialNode.connect(ctx.destination);
      } else {
        applySpatialConfig(this._spatialNode, config!);
      }
    });
  }

  private _loadAudio(assetId: string, layer: Layer): void {
    this._assetId = assetId;
    this._ready = false;
    this._loggedLoad = false;
    this._teardownAudioGraph();

    if (this._audio) {
      unregisterForUnlock(this._audio);
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

      // Set up Web Audio graph:
      // source → gain → pan → [effects chain] → [EQ chain] → destination
      try {
        const ctx = getAudioContext();
        this._source = ctx.createMediaElementSource(audio);
        this._gainNode = ctx.createGain();
        this._panNode = ctx.createStereoPanner();
        this._effectsInput = ctx.createGain();
        this._effectsOutput = ctx.createGain();
        this._eqInput = ctx.createGain();
        this._eqOutput = ctx.createGain();

        // Baseline routing (no effects/EQ yet):
        this._source.connect(this._gainNode);
        this._gainNode.connect(this._panNode);
        this._panNode.connect(this._effectsInput);
        this._effectsInput.connect(this._effectsOutput);
        this._effectsOutput.connect(this._eqInput);
        this._eqInput.connect(this._eqOutput);
        this._eqOutput.connect(ctx.destination);
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
              registerForUnlock(audio);
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
    registerForUnlock(audio);
    this._audio = audio;
  }
}