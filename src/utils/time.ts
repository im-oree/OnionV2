/**
 * Time formatting utilities for timeline display.
 * Supports frames, seconds, and SMPTE timecode formats.
 */

export type TimeDisplayMode = 'frames' | 'seconds' | 'smpte';

/** Format time in seconds to HH:MM:SS:FF at given frame rate */
export function formatTime(seconds: number, fps: number, mode: TimeDisplayMode = 'smpte'): string {
  const totalFrames = Math.floor(seconds * fps);
  
  if (mode === 'frames') {
    return `${totalFrames}f`;
  }
  
  if (mode === 'seconds') {
    return `${seconds.toFixed(1)}s`;
  }
  
  // SMPTE (default)
  const h = Math.floor(totalFrames / (3600 * fps));
  const m = Math.floor((totalFrames % (3600 * fps)) / (60 * fps));
  const s = Math.floor((totalFrames % (60 * fps)) / fps);
  const f = totalFrames % fps;
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

/** Pad a number to 2 digits */
export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Convert frames to seconds at given frame rate */
export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/** Convert seconds to frames at given frame rate */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/** Format seconds as SMPTE timecode (HH:MM:SS:Frame) */
export function toSMPTE(seconds: number, fps: number): string {
  return formatTime(seconds, fps);
}

/** Format seconds as a short human-readable string (e.g. "2s", "1m 30s") */
export function toHumanReadable(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s.toFixed(0)}s` : `${m}m`;
}
