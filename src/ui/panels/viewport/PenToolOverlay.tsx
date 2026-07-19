import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePenToolStore } from '../../../state/penToolStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useToolStore } from '../../../state/toolStore';
import { TOOLS } from '../../../config/constants';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { Layer, ShapePath, PathCommand } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

interface DragState {
  type: 'anchor' | 'handle-in' | 'handle-out';
  layerId: string;
  index: number;
  lastWorldX: number;
  lastWorldY: number;
}

export const PenToolOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const tool = useToolStore((s) => s.activeTool);
  const mode = usePenToolStore((s) => s.mode);
  const drawingCommands = usePenToolStore((s) => s.drawingCommands);
  const lastAnchor = usePenToolStore((s) => s.lastAnchor);
  const lastOutHandle = usePenToolStore((s) => s.lastOutHandle);
  const editingLayerId = usePenToolStore((s) => s.editingLayerId);
  const selectedAnchors = usePenToolStore((s) => s.selectedAnchors);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  useCameraSubscribe(cameraManager, () => forceUpdate((n) => n + 1));

  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);

  // Track mouse for draw preview
  useEffect(() => {
    if (mode !== 'draw' || tool !== (TOOLS.PEN as any)) { setMousePos(null); return; }
    const onMove = (e: MouseEvent) => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !cameraManager) return;
      const rect = canvas.getBoundingClientRect();
      const world = cameraManager.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      setMousePos({ x: world.x, y: world.y });
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [mode, tool, cameraManager]);

  // Handle drag operations for edit mode
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !cameraManager) return;
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = cameraManager.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

      // Convert world delta to local (undo layer transform)
      const cs = useCompositionStore.getState();
      const compId = cs.activeCompositionId;
      if (!compId) return;
      const comp = cs.compositions.find(c => c.id === compId);
      const layer = comp?.layers.find(l => l.id === d.layerId);
      if (!layer) return;
      const sx = layer.transform.scale.x / 100;
      const sy = layer.transform.scale.y / 100;
      const dx = (world.x - d.lastWorldX) / sx;
      const dy = (world.y - d.lastWorldY) / sy;
      d.lastWorldX = world.x;
      d.lastWorldY = world.y;

      const store = usePenToolStore.getState();
      if (d.type === 'anchor') store.moveAnchor(d.layerId, d.index, dx, dy);
      else if (d.type === 'handle-in') store.moveHandle(d.layerId, d.index, 'in', dx, dy);
      else if (d.type === 'handle-out') store.moveHandle(d.layerId, d.index, 'out', dx, dy);
    };
    const onUp = () => { dragRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [cameraManager]);

  if (!cameraManager || viewportSize.width === 0) return null;
  if (tool !== (TOOLS.PEN as any) && mode !== 'edit') return null;

  const w2s = (x: number, y: number) => cameraManager.worldToScreen(x, y);

  // ─── DRAW MODE ─────────────────────────────────────────
  if (mode === 'draw' && tool === (TOOLS.PEN as any)) {
    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 26 }}
        width={viewportSize.width} height={viewportSize.height}>
        <PathPreview commands={drawingCommands} w2s={w2s} />
        {getAnchorPoints(drawingCommands).map((p, i) => {
          const s = w2s(p.x, p.y);
          const isFirst = i === 0;
          return <Anchor key={i} x={s.x} y={s.y} selected={false}
            color={isFirst && drawingCommands.length > 1 ? '#4ade80' : 'var(--color-accent)'} />;
        })}
        {lastAnchor && mousePos && (() => {
          const from = w2s(lastAnchor.x, lastAnchor.y);
          const to = w2s(mousePos.x, mousePos.y);
          const outH = lastOutHandle ? w2s(lastOutHandle.x, lastOutHandle.y) : null;
          if (outH) {
            const c1 = outH;
            const c2 = { x: 2 * to.x - outH.x, y: 2 * to.y - outH.y };
            return <path d={`M${from.x},${from.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`}
              fill="none" stroke="var(--color-accent)" strokeWidth={1.5} opacity={0.6} strokeDasharray="4 3" />;
          }
          return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke="var(--color-accent)" strokeWidth={1.5} opacity={0.6} strokeDasharray="4 3" />;
        })()}
        {lastAnchor && lastOutHandle && (() => {
          const a = w2s(lastAnchor.x, lastAnchor.y);
          const h = w2s(lastOutHandle.x, lastOutHandle.y);
          return <React.Fragment key="live-handle">
            <line x1={a.x} y1={a.y} x2={h.x} y2={h.y} stroke="#fff" strokeWidth={1} opacity={0.5} />
            <circle cx={h.x} cy={h.y} r={3} fill="#fff" stroke="var(--color-accent)" strokeWidth={1} />
          </React.Fragment>;
        })()}
      </svg>
    );
  }

  // ─── EDIT MODE ─────────────────────────────────────────
  if (mode === 'edit' && editingLayerId && comp) {
    const layer = comp.layers.find((l) => l.id === editingLayerId);
    if (!layer || layer.type !== 'shape') return null;
    const path = layer.data as ShapePath;
    if (path.type !== 'path') return null;

    const anchors = getAnchorPoints(path.commands);
    const anchorRefs = getAnchorRefs(path.commands);
    const tx = layer.transform.position.x;
    const ty = layer.transform.position.y;
    const sx = layer.transform.scale.x / 100;
    const sy = layer.transform.scale.y / 100;
    const local2world = (x: number, y: number) => ({ x: tx + x * sx, y: ty + y * sy });

    // Interactive anchor mousedown handler
    const anchorMouseDown = (index: number, e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.altKey) {
        // Delete anchor
        usePenToolStore.getState().deleteAnchor(editingLayerId, index);
        return;
      }
      const ap = anchors[index];
      const w = local2world(ap.x, ap.y);
      dragRef.current = { type: 'anchor', layerId: editingLayerId, index, lastWorldX: w.x, lastWorldY: w.y };
      usePenToolStore.getState().toggleAnchor(index, e.shiftKey);
    };

    const handleMouseDown = (which: 'in' | 'out', index: number, e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      const ap = anchors[index];
      const w = local2world(ap.x, ap.y);
      dragRef.current = {
        type: which === 'in' ? 'handle-in' : 'handle-out',
        layerId: editingLayerId, index,
        lastWorldX: w.x, lastWorldY: w.y,
      };
    };

    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 26 }}
        width={viewportSize.width} height={viewportSize.height}>
        <EditPathPreview layer={layer} path={path} w2s={w2s} />

        {/* Handles: draw for selected anchors */}
        {anchors.map((p, i) => {
          if (!selectedAnchors.has(i)) return null;
          const worldA = local2world(p.x, p.y);
          const sA = w2s(worldA.x, worldA.y);
          const inH = getInHandle(path.commands, anchorRefs, i);
          const outH = getOutHandle(path.commands, anchorRefs, i);
          return (
            <React.Fragment key={`h${i}`}>
              {inH && (() => {
                const wh = local2world(inH.x, inH.y);
                const sh = w2s(wh.x, wh.y);
                return <React.Fragment>
                  <line x1={sA.x} y1={sA.y} x2={sh.x} y2={sh.y} stroke="#fff" strokeWidth={1} opacity={0.6} />
                  <circle cx={sh.x} cy={sh.y} r={4} fill="#fff" stroke="var(--color-accent)" strokeWidth={1.5}
                    onMouseDown={(e) => handleMouseDown('in', i, e)}
                    style={{ pointerEvents: 'all', cursor: 'move' }} />
                </React.Fragment>;
              })()}
              {outH && (() => {
                const wh = local2world(outH.x, outH.y);
                const sh = w2s(wh.x, wh.y);
                return <React.Fragment>
                  <line x1={sA.x} y1={sA.y} x2={sh.x} y2={sh.y} stroke="#fff" strokeWidth={1} opacity={0.6} />
                  <circle cx={sh.x} cy={sh.y} r={4} fill="#fff" stroke="var(--color-accent)" strokeWidth={1.5}
                    onMouseDown={(e) => handleMouseDown('out', i, e)}
                    style={{ pointerEvents: 'all', cursor: 'move' }} />
                </React.Fragment>;
              })()}
            </React.Fragment>
          );
        })}

        {/* Interactive anchor squares */}
        {anchors.map((p, i) => {
          const w = local2world(p.x, p.y);
          const s = w2s(w.x, w.y);
          const sel = selectedAnchors.has(i);
          const size = sel ? 6 : 4.5;
          return (
            <rect key={i}
              x={s.x - size} y={s.y - size}
              width={size * 2} height={size * 2}
              fill={sel ? '#fff' : 'var(--color-accent)'}
              stroke={sel ? 'var(--color-accent)' : '#000'}
              strokeWidth={sel ? 2 : 1}
              onMouseDown={(e) => anchorMouseDown(i, e)}
              style={{ pointerEvents: 'all', cursor: 'move' }}
            />
          );
        })}
      </svg>
    );
  }

  return null;
};

// ─── Helpers ──────────────────────────────

const PathPreview: React.FC<{
  commands: PathCommand[];
  w2s: (x: number, y: number) => { x: number; y: number };
}> = ({ commands, w2s }) => {
  let d = '';
  for (const cmd of commands) {
    const p = cmd.points;
    if (cmd.type === 'M') { const s = w2s(p[0], p[1]); d += `M${s.x},${s.y}`; }
    else if (cmd.type === 'L') { const s = w2s(p[0], p[1]); d += ` L${s.x},${s.y}`; }
    else if (cmd.type === 'C') {
      const c1 = w2s(p[0], p[1]), c2 = w2s(p[2], p[3]), end = w2s(p[4], p[5]);
      d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
    } else if (cmd.type === 'Q') {
      const c = w2s(p[0], p[1]), end = w2s(p[2], p[3]);
      d += ` Q${c.x},${c.y} ${end.x},${end.y}`;
    } else if (cmd.type === 'Z') d += ' Z';
  }
  return <React.Fragment>
    <path d={d} fill="none" stroke="#000" strokeWidth={3} opacity={0.4} />
    <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
  </React.Fragment>;
};

const EditPathPreview: React.FC<{
  layer: Layer; path: ShapePath;
  w2s: (x: number, y: number) => { x: number; y: number };
}> = ({ layer, path, w2s }) => {
  const tx = layer.transform.position.x;
  const ty = layer.transform.position.y;
  const sx = layer.transform.scale.x / 100;
  const sy = layer.transform.scale.y / 100;
  let d = '';
  for (const cmd of path.commands) {
    const p = cmd.points;
    const toW = (i: number) => ({ x: tx + p[i] * sx, y: ty + p[i + 1] * sy });
    if (cmd.type === 'M') { const w = toW(0); const s = w2s(w.x, w.y); d += `M${s.x},${s.y}`; }
    else if (cmd.type === 'L') { const w = toW(0); const s = w2s(w.x, w.y); d += ` L${s.x},${s.y}`; }
    else if (cmd.type === 'C') {
      const w1 = toW(0), w2 = toW(2), we = toW(4);
      const s1 = w2s(w1.x, w1.y), s2 = w2s(w2.x, w2.y), se = w2s(we.x, we.y);
      d += ` C${s1.x},${s1.y} ${s2.x},${s2.y} ${se.x},${se.y}`;
    } else if (cmd.type === 'Z') d += ' Z';
  }
  return <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />;
};

const Anchor: React.FC<{ x: number; y: number; selected: boolean; color: string }> = ({ x, y, selected, color }) => {
  const size = selected ? 6 : 4;
  return <rect x={x - size} y={y - size} width={size * 2} height={size * 2}
    fill={selected ? color : '#fff'} stroke={color} strokeWidth={selected ? 2 : 1.5}
    style={{ pointerEvents: 'none' }} />;
};

function getAnchorPoints(commands: PathCommand[]): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (const cmd of commands) {
    const p = cmd.points;
    if (cmd.type === 'M' || cmd.type === 'L') result.push({ x: p[0], y: p[1] });
    else if (cmd.type === 'C') result.push({ x: p[4], y: p[5] });
    else if (cmd.type === 'Q') result.push({ x: p[2], y: p[3] });
  }
  return result;
}

function getAnchorRefs(commands: PathCommand[]): PathCommand[] {
  const refs: PathCommand[] = [];
  for (const cmd of commands) {
    if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') refs.push(cmd);
  }
  return refs;
}

/** In-handle = c2 of THIS anchor's C command (if it's a C) */
function getInHandle(commands: PathCommand[], anchorCmds: PathCommand[], index: number): { x: number; y: number } | null {
  const cmd = anchorCmds[index];
  if (!cmd || cmd.type !== 'C') return null;
  return { x: cmd.points[2], y: cmd.points[3] };
}

/** Out-handle = c1 of NEXT anchor's C command (if it's a C) */
function getOutHandle(commands: PathCommand[], anchorCmds: PathCommand[], index: number): { x: number; y: number } | null {
  const next = anchorCmds[index + 1];
  if (!next || next.type !== 'C') return null;
  return { x: next.points[0], y: next.points[1] };
}