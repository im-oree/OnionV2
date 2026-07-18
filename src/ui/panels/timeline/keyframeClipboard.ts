import type { Keyframe } from '../../../types/keyframe';

interface ClipboardEntry {
  /** Relative time offset from the earliest copied keyframe */
  relativeTime: number;
  /** Original keyframe data (without id/time) */
  data: Omit<Keyframe, 'id' | 'time'>;
}

let clipboard: ClipboardEntry[] = [];

export const keyframeClipboard = {
  copy(keyframes: Keyframe[]): void {
    if (keyframes.length === 0) return;
    const minTime = Math.min(...keyframes.map(k => k.time));
    clipboard = keyframes.map(k => {
      const { id: _id, time, ...rest } = k;
      return { relativeTime: time - minTime, data: rest };
    });
  },
  paste(atFrame: number): Array<{ layerId: string; keyframe: Keyframe }> {
    const out: Array<{ layerId: string; keyframe: Keyframe }> = [];
    for (const entry of clipboard) {
      const kf: Keyframe = {
        ...entry.data,
        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        time: Math.round(atFrame + entry.relativeTime),
      };
      out.push({ layerId: entry.data.layerId, keyframe: kf });
    }
    return out;
  },
  hasData(): boolean { return clipboard.length > 0; },
  clear(): void { clipboard = []; },
};