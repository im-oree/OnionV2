import { create } from 'zustand';
import type { PathCommand } from '../types/layer';
import { computePathBounds } from '../types/layer';
import { useCompositionStore } from './compositionStore';

export type PenMode = 'draw' | 'edit' | null;

export interface PenState {
  mode: PenMode;
  /** Path being drawn (world coords) */
  drawingCommands: PathCommand[];
  /** Last anchor point (world coords) */
  lastAnchor: { x: number; y: number } | null;
  /** Handle direction from last anchor (out-handle) */
  lastOutHandle: { x: number; y: number } | null;
  /** Layer being edited (for edit mode) */
  editingLayerId: string | null;
  /** Selected anchor indices while editing */
  selectedAnchors: Set<number>;

  startDrawing: () => void;
  addAnchor: (x: number, y: number, outHandleX?: number, outHandleY?: number) => void;
  updateLastHandle: (x: number, y: number) => void;
  closePath: () => PathCommand[] | null;
  finishPath: () => PathCommand[] | null;
  cancelDrawing: () => void;

  startEditing: (layerId: string) => void;
  stopEditing: () => void;
  toggleAnchor: (index: number, add: boolean) => void;
  clearSelectedAnchors: () => void;
  moveAnchor: (layerId: string, index: number, dx: number, dy: number) => void;
  moveHandle: (layerId: string, anchorIndex: number, which: 'in' | 'out', dx: number, dy: number) => void;
  deleteAnchor: (layerId: string, index: number) => void;
  insertAnchor: (layerId: string, segmentIndex: number, t: number) => void;
  convertAnchor: (layerId: string, index: number, toSmooth: boolean) => void;
}

export const usePenToolStore = create<PenState>((set, get) => ({
  mode: null,
  drawingCommands: [],
  lastAnchor: null,
  lastOutHandle: null,
  editingLayerId: null,
  selectedAnchors: new Set(),

  startDrawing: () => set({
    mode: 'draw',
    drawingCommands: [],
    lastAnchor: null,
    lastOutHandle: null,
    editingLayerId: null,
  }),

  addAnchor: (x, y, outHx, outHy) => {
    const s = get();
    const cmds = [...s.drawingCommands];
    if (cmds.length === 0) {
      cmds.push({ type: 'M', points: [x, y] });
    } else {
      // If we had an out-handle from previous anchor OR an in-handle at this new anchor, use cubic
      const prevAnchor = s.lastAnchor!;
      const prevOut = s.lastOutHandle;
      if (prevOut || outHx !== undefined) {
        const c1x = prevOut ? prevOut.x : prevAnchor.x;
        const c1y = prevOut ? prevOut.y : prevAnchor.y;
        // In-handle at new anchor = mirror of out-handle across anchor
        const c2x = outHx !== undefined ? (2 * x - outHx) : x;
        const c2y = outHy !== undefined ? (2 * y - outHy) : y;
        cmds.push({ type: 'C', points: [c1x, c1y, c2x, c2y, x, y] });
      } else {
        cmds.push({ type: 'L', points: [x, y] });
      }
    }
    set({
      drawingCommands: cmds,
      lastAnchor: { x, y },
      lastOutHandle: outHx !== undefined ? { x: outHx, y: outHy! } : null,
    });
  },

  updateLastHandle: (x, y) => {
    set({ lastOutHandle: { x, y } });
  },

  closePath: () => {
    const s = get();
    if (s.drawingCommands.length === 0) return null;
    const cmds = [...s.drawingCommands, { type: 'Z' as const, points: [] }];
    set({ mode: null, drawingCommands: [], lastAnchor: null, lastOutHandle: null });
    return cmds;
  },

  finishPath: () => {
    const s = get();
    if (s.drawingCommands.length === 0) return null;
    const cmds = [...s.drawingCommands];
    set({ mode: null, drawingCommands: [], lastAnchor: null, lastOutHandle: null });
    return cmds;
  },

  cancelDrawing: () => set({
    mode: null,
    drawingCommands: [],
    lastAnchor: null,
    lastOutHandle: null,
  }),

  startEditing: (layerId) => set({
    mode: 'edit',
    editingLayerId: layerId,
    selectedAnchors: new Set(),
  }),

  stopEditing: () => set({
    mode: null,
    editingLayerId: null,
    selectedAnchors: new Set(),
  }),

  toggleAnchor: (index, add) => set((s) => {
    const next = add ? new Set(s.selectedAnchors) : new Set<number>();
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return { selectedAnchors: next };
  }),

  clearSelectedAnchors: () => set({ selectedAnchors: new Set() }),

  moveAnchor: (layerId, index, dx, dy) => {
    _mutatePath(layerId, (cmds) => {
      const anchors = _getAnchorRefs(cmds);
      const target = anchors[index];
      if (!target) return;
      // Move the anchor itself
      target.cmd.points[target.pointIdx] += dx;
      target.cmd.points[target.pointIdx + 1] += dy;
      // Move associated handles (in-handle of this C, out-handle of next C if smooth)
      if (target.cmd.type === 'C') {
        target.cmd.points[2] += dx;
        target.cmd.points[3] += dy;
      }
      const nextIdx = index + 1;
      if (nextIdx < anchors.length) {
        const next = anchors[nextIdx];
        if (next.cmd.type === 'C') {
          next.cmd.points[0] += dx;
          next.cmd.points[1] += dy;
        }
      }
    });
  },

  moveHandle: (layerId, anchorIndex, which, dx, dy) => {
    _mutatePath(layerId, (cmds) => {
      const anchors = _getAnchorRefs(cmds);
      if (which === 'in') {
        const a = anchors[anchorIndex];
        if (a?.cmd.type === 'C') {
          a.cmd.points[2] += dx;
          a.cmd.points[3] += dy;
        }
      } else {
        const next = anchors[anchorIndex + 1];
        if (next?.cmd.type === 'C') {
          next.cmd.points[0] += dx;
          next.cmd.points[1] += dy;
        }
      }
    });
  },

  deleteAnchor: (layerId, index) => {
    _mutatePath(layerId, (cmds) => {
      const anchors = _getAnchorRefs(cmds);
      if (anchors.length <= 2 || index < 0 || index >= anchors.length) return;
      // Find the command index of this anchor and remove it
      const target = anchors[index];
      const cmdIdx = cmds.indexOf(target.cmd);
      if (cmdIdx === -1) return;
      // If it's the first M, promote the next command to M
      if (target.cmd.type === 'M' && cmds.length > 1) {
        const next = cmds[1];
        if (next.type === 'L' || next.type === 'C' || next.type === 'Q') {
          const endIdx = next.type === 'C' ? 4 : (next.type === 'Q' ? 2 : 0);
          cmds[1] = { type: 'M', points: [next.points[endIdx], next.points[endIdx + 1]] };
        }
      }
      cmds.splice(cmdIdx, 1);
    });
  },

  insertAnchor: (layerId, segmentIndex, t) => {
    _mutatePath(layerId, (cmds) => {
      const anchors = _getAnchorRefs(cmds);
      if (segmentIndex < 0 || segmentIndex >= anchors.length - 1) return;
      const a = anchors[segmentIndex];
      const b = anchors[segmentIndex + 1];
      const ax = a.cmd.points[a.pointIdx], ay = a.cmd.points[a.pointIdx + 1];
      const bx = b.cmd.points[b.pointIdx], by = b.cmd.points[b.pointIdx + 1];
      // Simple linear insert (bezier subdivision could be added later)
      const nx = ax + (bx - ax) * t;
      const ny = ay + (by - ay) * t;
      const cmdIdxB = cmds.indexOf(b.cmd);
      cmds.splice(cmdIdxB, 0, { type: 'L', points: [nx, ny] });
    });
  },

  convertAnchor: (layerId, index, toSmooth) => {
    _mutatePath(layerId, (cmds) => {
      const anchors = _getAnchorRefs(cmds);
      const target = anchors[index];
      if (!target) return;
      const cmdIdx = cmds.indexOf(target.cmd);

      if (toSmooth && target.cmd.type === 'L') {
        // Convert L to C with smooth handles
        const prev = anchors[index - 1];
        if (!prev) return;
        const prevX = prev.cmd.points[prev.pointIdx];
        const prevY = prev.cmd.points[prev.pointIdx + 1];
        const ax = target.cmd.points[target.pointIdx];
        const ay = target.cmd.points[target.pointIdx + 1];
        const c1x = prevX + (ax - prevX) * 0.33;
        const c1y = prevY + (ay - prevY) * 0.33;
        const c2x = prevX + (ax - prevX) * 0.66;
        const c2y = prevY + (ay - prevY) * 0.66;
        cmds[cmdIdx] = { type: 'C', points: [c1x, c1y, c2x, c2y, ax, ay] };
      } else if (!toSmooth && target.cmd.type === 'C') {
        // Convert C to L
        const ax = target.cmd.points[4];
        const ay = target.cmd.points[5];
        cmds[cmdIdx] = { type: 'L', points: [ax, ay] };
      }
    });
  },
}));

// ─── Path mutation helpers ─────────────────────────────

function _getAnchorRefs(cmds: PathCommand[]): Array<{ cmd: PathCommand; pointIdx: number }> {
  const refs: Array<{ cmd: PathCommand; pointIdx: number }> = [];
  for (const cmd of cmds) {
    if (cmd.type === 'M' || cmd.type === 'L') refs.push({ cmd, pointIdx: 0 });
    else if (cmd.type === 'C') refs.push({ cmd, pointIdx: 4 });
    else if (cmd.type === 'Q') refs.push({ cmd, pointIdx: 2 });
  }
  return refs;
}

function _mutatePath(layerId: string, mutator: (cmds: PathCommand[]) => void): void {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;
  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer || layer.type !== 'shape') return;
  const data = layer.data as any;
  if (!data || data.type !== 'path') return;
  // Deep clone commands
  const newCmds = data.commands.map((c: PathCommand) => ({
    type: c.type,
    points: [...c.points],
  }));
  mutator(newCmds);
  const newBounds = computePathBounds(newCmds);
  cs.updateLayer(compId, layerId, {
    data: { ...data, commands: newCmds, bounds: newBounds },
  });
}