/**
 * Shared AudioContext across the app — avoids "multiple AudioContext" warnings
 * and lets us route both audio layers and video-layer audio through the same graph.
 */
let _sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!_sharedCtx) {
    _sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _sharedCtx;
}

/** Global unlock handler for autoplay policy — installs once */
const pendingUnlock = new Set<HTMLMediaElement>();
let unlockHandlerInstalled = false;

export function registerForUnlock(el: HTMLMediaElement): void {
  // If AudioContext is already unlocked (previous gesture), unmute immediately
  if (_sharedCtx && _sharedCtx.state === 'running') {
    el.muted = false;
    return;
  }
  pendingUnlock.add(el);
}

export function unregisterForUnlock(el: HTMLMediaElement): void {
  pendingUnlock.delete(el);
}

export async function suspendAudio(): Promise<void> {
  if (_sharedCtx && _sharedCtx.state === 'running') {
    try { await _sharedCtx.suspend(); } catch {}
  }
}

export async function resumeAudio(): Promise<void> {
  if (_sharedCtx && _sharedCtx.state === 'suspended') {
    try { await _sharedCtx.resume(); } catch {}
  }
}

export function installUnlockHandler(): void {
  if (unlockHandlerInstalled) return;
  unlockHandlerInstalled = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    for (const el of pendingUnlock) {
      // Temporarily mute for play() to succeed, then unmute after first gesture
      // so audio data flows through MediaElementSource → Web Audio graph.
      el.muted = true;
      el.play().then(() => {
        el.pause();
        el.muted = false; // unmute after gesture — audio goes through Web Audio
      }).catch(() => {
        el.muted = false; // unmute even on failure — retry on next gesture
      });
    }
    pendingUnlock.clear();
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('click', unlock, { capture: true });
}
