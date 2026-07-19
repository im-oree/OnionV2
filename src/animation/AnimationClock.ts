/**
 * AnimationClock — drives frame advancement for playback.
 * Uses performance.now() for high-resolution timing.
 * Emits frame-changed events; never triggers React re-renders directly.
 *
 * FIX: Accumulator is now properly reset to zero (not made negative)
 * when the MAX_CONSUMED cap is hit. The old code did:
 *   accumulator = 0; then accumulator -= consumed * frameBudget
 * which produced a large negative accumulator, causing a timing gap
 * before the next frame, resulting in uneven/stuttery playback.
 */
type Listener<T = unknown> = (data: T) => void;

export type LoopMode = 'none' | 'loop' | 'ping-pong';
export type PlaybackMode = 'realtime' | 'accurate' | 'cacheOnly';

export type ClockEventPayloads = {
  'frame-changed': { frame: number; time: number };
  play: { frame: number };
  pause: { frame: number };
  stop: { frame: number };
};

export class AnimationClock {
  private _handlers = new Map<string, Set<Listener>>();

  on<K extends string>(
    event: K,
    handler: Listener<
      ClockEventPayloads[K & keyof ClockEventPayloads]
    >,
  ): void {
    let set = this._handlers.get(event);
    if (!set) {
      set = new Set();
      this._handlers.set(event, set);
    }
    set.add(handler as Listener);
  }

  off<K extends string>(
    event: K,
    handler: Listener<
      ClockEventPayloads[K & keyof ClockEventPayloads]
    >,
  ): void {
    const set = this._handlers.get(event);
    if (set) {
      set.delete(handler as Listener);
      if (set.size === 0) this._handlers.delete(event);
    }
  }

  private _emit<K extends string>(
    event: K,
    data: ClockEventPayloads[K & keyof ClockEventPayloads],
  ): void {
    const set = this._handlers.get(event);
    if (set) {
      for (const h of set) h(data);
    }
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
  private _frameBudget = 1000 / 30;
  private _lastTimestamp = 0;
  private _accumulator = 0;
  private _forward = true;
  private _rafId: number | null = null;

  play(): void {
    if (this._isPlaying) {
      console.log('[AnimClock] play() called but already playing, _currentFrame=', this._currentFrame);
      return;
    }
    console.log('[AnimClock] play() called, _currentFrame=', this._currentFrame, '_fps=', this._fps, '_totalFrames=', this._totalFrames);
    this._isPlaying = true;
    this._forward = this._playbackRate >= 0;
    this._lastTimestamp = performance.now();
    this._accumulator = 0;
    this._emit('play', { frame: this._currentFrame });
    this._rafId = requestAnimationFrame(this._tick);
  }

  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._emit('pause', { frame: this._currentFrame });
  }

  togglePlay(): void {
    if (this._isPlaying) this.pause();
    else this.play();
  }

  stop(): void {
    this.pause();
    this._currentFrame = this._useWorkArea ? this._workAreaStart : 0;
    this._accumulator = 0;
    this._emit('stop', { frame: this._currentFrame });
    this._emit('frame-changed', {
      frame: this._currentFrame,
      time: this._currentFrame / this._fps,
    });
  }

  seekToFrame(frame: number): void {
    this._currentFrame = Math.max(
      0,
      Math.min(this._totalFrames, Math.round(frame)),
    );
    this._accumulator = 0;
    this._emit('frame-changed', {
      frame: this._currentFrame,
      time: this._currentFrame / this._fps,
    });
  }

  seekToTime(seconds: number): void {
    this.seekToFrame(Math.round(seconds * this._fps));
  }

  setFps(fps: number): void {
    this._fps = fps;
    this._frameBudget = 1000 / Math.max(1, fps);
  }
  setTotalFrames(n: number): void { this._totalFrames = n; }
  setPlaybackRate(rate: number): void { this._playbackRate = rate; }
  setLoopMode(mode: LoopMode): void { this._loopMode = mode; }
  setPlaybackMode(mode: PlaybackMode): void { this._playbackMode = mode; }
  setWorkArea(start: number, end: number): void {
    this._workAreaStart = start;
    this._workAreaEnd = end;
  }
  setUseWorkArea(use: boolean): void { this._useWorkArea = use; }

  get isPlaying(): boolean { return this._isPlaying; }
  get currentFrame(): number { return this._currentFrame; }
  get currentTime(): number { return this._currentFrame / this._fps; }
  get fps(): number { return this._fps; }
  get totalFrames(): number { return this._totalFrames; }
  get loopMode(): LoopMode { return this._loopMode; }
  get playbackMode(): PlaybackMode { return this._playbackMode; }
  get playbackRate(): number { return this._playbackRate; }

  stepForward(): void { this.seekToFrame(this._currentFrame + 1); }
  stepBackward(): void { this.seekToFrame(this._currentFrame - 1); }
  jumpForward(frames: number): void {
    this.seekToFrame(this._currentFrame + frames);
  }
  jumpBackward(frames: number): void {
    this.seekToFrame(this._currentFrame - frames);
  }
  goToStart(): void {
    this.seekToFrame(this._useWorkArea ? this._workAreaStart : 0);
  }
  goToEnd(): void {
    this.seekToFrame(
      this._useWorkArea ? this._workAreaEnd : this._totalFrames,
    );
  }

  dispose(): void {
    this.pause();
    this._handlers.clear();
  }

  private _tick = (now: number): void => {
    if (!this._isPlaying) {
      console.log('[AnimClock] _tick fired but _isPlaying is false, returning');
      return;
    }

    const elapsed = now - this._lastTimestamp;
    this._lastTimestamp = now;

    this._forward = this._playbackRate >= 0;
    const effectiveRate = Math.abs(this._playbackRate);

    this._accumulator += elapsed * effectiveRate;

    // Cap to prevent spiral-of-death after tab backgrounding.
    const MAX_ACCUMULATOR = this._frameBudget * 3;
    if (this._accumulator > MAX_ACCUMULATOR) {
      this._accumulator = MAX_ACCUMULATOR;
    }

    const consumed = Math.floor(this._accumulator / this._frameBudget);

    if (consumed > 0) {
      // Subtract exactly what we consume — accumulator stays non-negative
      this._accumulator -= consumed * this._frameBudget;

      const boundStart = this._useWorkArea ? this._workAreaStart : 0;
      const boundEnd = this._useWorkArea ? this._workAreaEnd : this._totalFrames;

      console.log('[AnimClock] _tick consuming', consumed, 'frames, currentFrame before:', this._currentFrame, 'bounds:', boundStart, '-', boundEnd);

      let stopped = false;

      for (let i = 0; i < consumed; i++) {
        if (this._forward) this._currentFrame++;
        else this._currentFrame--;

        if (this._currentFrame > boundEnd) {
          if (this._loopMode === 'loop') {
            this._currentFrame = boundStart;
          } else if (this._loopMode === 'ping-pong') {
            this._forward = false;
            this._currentFrame = boundEnd - 1;
          } else {
            this._currentFrame = boundEnd;
            stopped = true;
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
            stopped = true;
            break;
          }
        }
      }

      console.log('[AnimClock] _tick emitting frame-changed, frame:', this._currentFrame);
      this._emit('frame-changed', {
        frame: this._currentFrame,
        time: this._currentFrame / this._fps,
      });

      if (stopped) {
        console.log('[AnimClock] _tick paused at end');
        this.pause();
        return;
      }
    }

    this._rafId = requestAnimationFrame(this._tick);
  };
}