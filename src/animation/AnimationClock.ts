/**
 * AnimationClock — drives frame advancement for playback.
 * Uses performance.now() for high-resolution timing.
 * Emits frame-changed events; never triggers React re-renders directly.
 */
type Listener<T = unknown> = (data: T) => void;

export type LoopMode = 'none' | 'loop' | 'ping-pong';

/** Playback mode: how the clock handles frame advancement */
export type PlaybackMode = 'realtime' | 'accurate' | 'cacheOnly';

export type ClockEventPayloads = {
  'frame-changed': { frame: number; time: number };
  'play': { frame: number };
  'pause': { frame: number };
  'stop': { frame: number };
};

export class AnimationClock {
  private _handlers = new Map<string, Set<Listener>>();

  on<K extends string>(event: K, handler: Listener<ClockEventPayloads[K & keyof ClockEventPayloads]>): void {
    let set = this._handlers.get(event);
    if (!set) { set = new Set(); this._handlers.set(event, set); }
    set.add(handler as Listener);
  }

  off<K extends string>(event: K, handler: Listener<ClockEventPayloads[K & keyof ClockEventPayloads]>): void {
    const set = this._handlers.get(event);
    if (set) { set.delete(handler as Listener); if (set.size === 0) this._handlers.delete(event); }
  }

  private _emit<K extends string>(event: K, data: ClockEventPayloads[K & keyof ClockEventPayloads]): void {
    const set = this._handlers.get(event);
    if (set) { for (const h of set) h(data); }
  }

  private _isPlaying = false;
  private _playbackRate = 1;
  private _loopMode: LoopMode = 'none';
  private _playbackMode: PlaybackMode = 'realtime';
  private _fps = 30;
  private _currentFrame = 0;
  private _totalFrames = 300;
  private _workAreaStart = 0;
  private _workAreaEnd = 300;
  private _useWorkArea = false;
  private _frameBudget = 33; // ms per frame at 30fps
  private _lastTimestamp = 0;
  private _accumulator = 0;
  private _forward = true;
  private _rafId: number | null = null;

  /** Start playback */
  play(): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this._forward = true;
    this._lastTimestamp = performance.now();
    this._accumulator = 0;
    this._emit('play', { frame: this._currentFrame });
    this._tick();
  }

  /** Pause playback */
  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._emit('pause', { frame: this._currentFrame });
  }

  /** Toggle play/pause */
  togglePlay(): void {
    if (this._isPlaying) this.pause();
    else this.play();
  }

  /** Stop and reset to start */
  stop(): void {
    this.pause();
    this._currentFrame = this._useWorkArea ? this._workAreaStart : 0;
    this._emit('stop', { frame: this._currentFrame });
    this._emit('frame-changed', { frame: this._currentFrame, time: this._currentFrame / this._fps });
  }

  /** Seek to a specific frame */
  seekToFrame(frame: number): void {
    this._currentFrame = Math.max(0, Math.min(this._totalFrames, Math.round(frame)));
    this._accumulator = 0;
    this._emit('frame-changed', { frame: this._currentFrame, time: this._currentFrame / this._fps });
  }

  /** Seek to a specific time in seconds */
  seekToTime(seconds: number): void {
    this.seekToFrame(Math.round(seconds * this._fps));
  }

  // ── Setters ────────────────────────────────────────────
  setFps(fps: number): void { this._fps = fps; this._frameBudget = 1000 / fps; }
  setTotalFrames(n: number): void { this._totalFrames = n; }
  setPlaybackRate(rate: number): void { this._playbackRate = rate; }
  setLoopMode(mode: LoopMode): void { this._loopMode = mode; }
  setPlaybackMode(mode: PlaybackMode): void { this._playbackMode = mode; }
  setWorkArea(start: number, end: number): void { this._workAreaStart = start; this._workAreaEnd = end; }
  setUseWorkArea(use: boolean): void { this._useWorkArea = use; }

  // ── Getters ────────────────────────────────────────────
  get isPlaying(): boolean { return this._isPlaying; }
  get currentFrame(): number { return this._currentFrame; }
  get currentTime(): number { return this._currentFrame / this._fps; }
  get fps(): number { return this._fps; }
  get totalFrames(): number { return this._totalFrames; }
  get loopMode(): LoopMode { return this._loopMode; }
  get playbackMode(): PlaybackMode { return this._playbackMode; }
  get playbackRate(): number { return this._playbackRate; }

  /** Step one frame forward (for arrow key frame stepping) */
  stepForward(): void { this.seekToFrame(this._currentFrame + 1); }
  stepBackward(): void { this.seekToFrame(this._currentFrame - 1); }
  jumpForward( frames: number): void { this.seekToFrame(this._currentFrame + frames); }
  jumpBackward(frames: number): void { this.seekToFrame(this._currentFrame - frames); }
  goToStart(): void { this.seekToFrame(this._useWorkArea ? this._workAreaStart : 0); }
  goToEnd(): void { this.seekToFrame(this._useWorkArea ? this._workAreaEnd : this._totalFrames); }

  dispose(): void {
    this.pause();
    this._handlers.clear();
  }

  // ── Private ────────────────────────────────────────────
  private _tick = (): void => {
    if (!this._isPlaying) return;

    const now = performance.now();
    const elapsed = now - this._lastTimestamp;
    this._lastTimestamp = now;

    // Derive direction from playbackRate sign (supports reverse via negative rate)
    this._forward = this._playbackRate >= 0;
    const effectiveRate = Math.abs(this._playbackRate);

    // Accumulate time with playback rate
    this._accumulator += elapsed * effectiveRate;

    // Consume accumulator in frame-sized chunks
    let consumed = Math.floor(this._accumulator / this._frameBudget);
    // J4: Cap maximum consumed frames to prevent freezing on large frame skips
    // (e.g., when tab was backgrounded for several seconds)
    const MAX_CONSUMED = 10;
    if (consumed > MAX_CONSUMED) {
      consumed = MAX_CONSUMED;
      this._accumulator = 0; // reset accumulator to avoid spiral of death
    }
    if (consumed > 0) {
      this._accumulator -= consumed * this._frameBudget;

      // Apply frame changes
      for (let i = 0; i < consumed; i++) {
        if (this._forward) this._currentFrame++;
        else this._currentFrame--;

        // Boundary checks
        const boundStart = this._useWorkArea ? this._workAreaStart : 0;
        const boundEnd = this._useWorkArea ? this._workAreaEnd : this._totalFrames;

        if (this._currentFrame > boundEnd) {
          if (this._loopMode === 'loop') {
            this._currentFrame = boundStart;
          } else if (this._loopMode === 'ping-pong') {
            this._forward = false;
            this._currentFrame = boundEnd - 1;
          } else {
            this._currentFrame = boundEnd;
            this.pause();
            break;
          }
        } else if (this._currentFrame < boundStart) {
          if (this._loopMode === 'loop') {
            this._currentFrame = boundEnd;
          } else if (this._loopMode === 'ping-pong') {
            this._forward = true;
            this._currentFrame = boundStart + 1;
          } else {
            this._currentFrame = boundStart;
            this.pause();
            break;
          }
        }
      }

      this._emit('frame-changed', {
        frame: this._currentFrame,
        time: this._currentFrame / this._fps,
      });
    }

    this._rafId = requestAnimationFrame(this._tick);
  };
}
