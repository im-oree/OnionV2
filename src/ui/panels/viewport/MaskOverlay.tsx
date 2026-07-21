/**
 * MaskOverlay — draws mask outlines and handles for editing masks in the viewport.
 * When 'mask' tool is active:
 *   - Shows all masks on the selected layer with their outlines
 *   - Allows dragging anchor points of the selected mask
 *   - Clicking adds rectangle/ellipse mask directly
 */
import React, { useCallback, useRef, useState } from 'react';
import { useMaskStore } from '../../../state/maskStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useToolStore } from '../../../state/toolStore';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { PathCommand } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

export const MaskOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const tool = useToolStore(s => s.activeTool);
  const [, forceUpdate] = useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate(n => n + 1));

  const selectedIds = useSelectionStore(s =>
    s.selected.filter(x => x.type === 'layer').map(x => x.id)
  );
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  const maskStore = useMaskStore();
  const selectedMaskId = useMaskStore(s => s.selectedMaskId);

  const dragRef = useRef<{
    layerId: string;
    maskId: string;
    pointIdx: number;
    cmdIdx: number;
    startWorld: { x: number; y: number };
  } | null>(null);

  // ── Safe sx/sy before early returns so useCallback is always registered ──
  const sx = comp && selectedIds.length === 1
    ? (comp.layers.find(l => l.id === selectedIds[0])?.transform.scale.x ?? 100) / 100
    : 1;
  const sy = comp && selectedIds.length === 1
    ? (comp.layers.find(l => l.id === selectedIds[0])?.transform.scale.y ?? 100) / 100
    : 1;

  // handleAnchorDown must be BEFORE early returns (it's hook #9)
  // l2w/w2s are NOT used here — world position is computed inline
  const handleAnchorDown = useCallback((
    e: React.MouseEvent,
    layerId: string,
    maskId: string,
    localX: number,
    localY: number,
    cmdIdx: number,
    ptIdx: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    // Compute world position inline — avoids referencing l2w (defined after early returns)
    const cs = useCompositionStore.getState();
    const c = cs.compositions.find(c => c.id === cs.activeCompositionId);
    const l = c?.layers.find(l => l.id === layerId);
    const tx = l?.transform.position.x ?? 0;
    const ty = l?.transform.position.y ?? 0;
    const world = { x: tx + localX * sx, y: ty + localY * sy };
    dragRef.current = { layerId, maskId, pointIdx: ptIdx, cmdIdx, startWorld: world };
    maskStore.selectMask(maskId);

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !cameraManager) return;
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newWorld = cameraManager.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      const dx = (newWorld.x - d.startWorld.x) / sx;
      const dy = (newWorld.y - d.startWorld.y) / sy;

      const mask = useMaskStore.getState().getMasksForLayer(d.layerId).find(m => m.id === d.maskId);
      if (!mask) return;
      const newCmds = mask.commands.map((cmd, ci) => {
        if (ci !== d.cmdIdx) return cmd;
        const pts = [...cmd.points];
        pts[d.pointIdx] += dx;
        pts[d.pointIdx + 1] += dy;
        return { ...cmd, points: pts };
      });
      useMaskStore.getState().updateMaskCommands(d.layerId, d.maskId, newCmds);
      d.startWorld = newWorld;
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [cameraManager, maskStore, sx, sy]);

  // ── Early returns (all hooks are above, so this is safe) ──
  if (!cameraManager || selectedIds.length !== 1 || !comp) return null;
  if (tool !== 'select' && tool !== 'pen' && tool !== 'mask') return null;

  const layerId = selectedIds[0];
  const masks = maskStore.getMasksForLayer(layerId);
  if (masks.length === 0) return null;

  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return null;

  const tx = layer.transform.position.x;
  const ty = layer.transform.position.y;

  // local-to-world for mask coords
  const l2w = (x: number, y: number) => ({
    x: tx + x * sx,
    y: ty + y * sy,
  });

  const w2s = (wx: number, wy: number) => cameraManager.worldToScreen(wx, wy);

  const getAnchors = (commands: PathCommand[]) => {
    const pts: { x: number; y: number; cmdIdx: number; ptIdx: number }[] = [];
    commands.forEach((cmd, ci) => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        pts.push({ x: cmd.points[0], y: cmd.points[1], cmdIdx: ci, ptIdx: 0 });
      } else if (cmd.type === 'C') {
        pts.push({ x: cmd.points[4], y: cmd.points[5], cmdIdx: ci, ptIdx: 4 });
      } else if (cmd.type === 'Q') {
        pts.push({ x: cmd.points[2], y: cmd.points[3], cmdIdx: ci, ptIdx: 2 });
      }
    });
    return pts;
  };

  const maskToSvgD = (commands: PathCommand[]) => {
    let d = '';
    for (const cmd of commands) {
      const p = cmd.points;
      if (cmd.type === 'M') {
        const w = l2w(p[0], p[1]); const s = w2s(w.x, w.y);
        d += `M${s.x},${s.y}`;
      } else if (cmd.type === 'L') {
        const w = l2w(p[0], p[1]); const s = w2s(w.x, w.y);
        d += ` L${s.x},${s.y}`;
      } else if (cmd.type === 'C') {
        const w1 = l2w(p[0], p[1]); const s1 = w2s(w1.x, w1.y);
        const w2_ = l2w(p[2], p[3]); const s2 = w2s(w2_.x, w2_.y);
        const we = l2w(p[4], p[5]); const se = w2s(we.x, we.y);
        d += ` C${s1.x},${s1.y} ${s2.x},${s2.y} ${se.x},${se.y}`;
      } else if (cmd.type === 'Q') {
        const wq = l2w(p[0], p[1]); const sq = w2s(wq.x, wq.y);
        const we = l2w(p[2], p[3]); const se = w2s(we.x, we.y);
        d += ` Q${sq.x},${sq.y} ${se.x},${se.y}`;
      } else if (cmd.type === 'Z') {
        d += ' Z';
      }
    }
    return d;
  };

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 27 }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {masks.map(mask => {
        const isSelected = mask.id === selectedMaskId;
        const d = maskToSvgD(mask.commands);
        const anchors = isSelected ? getAnchors(mask.commands) : [];

        return (
          <g key={mask.id}>
            {/* Mask outline */}
            <path
              d={d}
              fill={mask.mode === 'add' ? 'rgba(74,144,226,0.08)' : 'rgba(226,91,74,0.08)'}
              stroke={isSelected ? mask.color : 'rgba(255,255,255,0.4)'}
              strokeWidth={isSelected ? 1.5 : 1}
              strokeDasharray={mask.inverted ? '5 3' : 'none'}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onClick={() => maskStore.selectMask(mask.id)}
            />

            {/* Feather outline (dashed ring outside mask when feather > 0) */}
            {mask.feather > 0 && (
              <path
                d={d}
                fill="none"
                stroke={mask.color}
                strokeWidth={mask.feather * 2}
                opacity={0.12}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Expansion outline */}
            {mask.expansion !== 0 && (
              <path
                d={d}
                fill="none"
                stroke={mask.color}
                strokeWidth={1}
                opacity={0.3}
                strokeDasharray={mask.expansion > 0 ? '2 2' : '6 2'}
                style={{ pointerEvents: 'none' }}
                transform={mask.expansion > 0 ? `scale(${1 + mask.expansion / 50})` : `scale(${1 + mask.expansion / 100})`}
              />
            )}

            {/* Anchor points when selected */}
            {isSelected && anchors.map((anchor, i) => {
              const world = l2w(anchor.x, anchor.y);
              const screen = w2s(world.x, world.y);
              return (
                <rect
                  key={i}
                  x={screen.x - 4} y={screen.y - 4}
                  width={8} height={8}
                  fill="white"
                  stroke={mask.color}
                  strokeWidth={1.5}
                  style={{ pointerEvents: 'all', cursor: 'move' }}
                  onMouseDown={(e) => handleAnchorDown(
                    e, layerId, mask.id,
                    anchor.x, anchor.y,
                    anchor.cmdIdx, anchor.ptIdx,
                  )}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};