export interface SnapTarget {
  frame: number;
  kind: 'playhead' | 'keyframe' | 'layerEdge' | 'workArea' | 'compEnd' | 'frameStep';
}

/** Snap a frame to nearest target within threshold (in frames). */
export function snapFrame(
  frame: number,
  targets: SnapTarget[],
  thresholdFrames: number,
): { frame: number; snappedTo: SnapTarget | null } {
  let best: SnapTarget | null = null;
  let bestDist = thresholdFrames;
  for (const t of targets) {
    const d = Math.abs(t.frame - frame);
    if (d < bestDist) { bestDist = d; best = t; }
  }
  return best ? { frame: best.frame, snappedTo: best } : { frame, snappedTo: null };
}

/** Build snap targets from composition state. */
export function buildSnapTargets(opts: {
  currentFrame: number;
  totalFrames: number;
  workAreaStart?: number;
  workAreaEnd?: number;
  layers: { startFrame: number; endFrame: number; id: string }[];
  keyframes: { time: number }[];
  excludeId?: string;
}): SnapTarget[] {
  const out: SnapTarget[] = [
    { frame: opts.currentFrame, kind: 'playhead' },
    { frame: 0, kind: 'compEnd' },
    { frame: opts.totalFrames, kind: 'compEnd' },
  ];
  if (opts.workAreaStart !== undefined) out.push({ frame: opts.workAreaStart, kind: 'workArea' });
  if (opts.workAreaEnd !== undefined) out.push({ frame: opts.workAreaEnd, kind: 'workArea' });
  for (const l of opts.layers) {
    if (l.id === opts.excludeId) continue;
    out.push({ frame: l.startFrame, kind: 'layerEdge' });
    out.push({ frame: l.endFrame, kind: 'layerEdge' });
  }
  for (const k of opts.keyframes) out.push({ frame: k.time, kind: 'keyframe' });
  return out;
}