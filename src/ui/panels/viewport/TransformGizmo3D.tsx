import React, { useCallback, useRef, useState } from 'react';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useToolStore } from '../../../state/toolStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

type Axis = 'x' | 'y' | 'z';
const COLORS: Record<Axis, string> = { x: '#ff3355', y: '#55dd33', z: '#3388ff' };
const ARROW_LEN = 60;

/**
 * TransformGizmo3D — Move/Scale arrows on selected 3D layers.
 * Shows arrows in Select/Move mode, boxes in Scale mode.
 */
export const TransformGizmo3D: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const [, forceUpdate] = useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate(n => n + 1));
  const orbitAngle = (window as any).__orbitAngle ?? 0;

  const selectedIds = useSelectionStore(s => s.selected.filter(x => x.type === 'layer').map(x => x.id));
  const comp = useCompositionStore(s => s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null : null);
  const isPerspective = comp?.perspective3D ?? false;
  const tool = useToolStore(s => s.activeTool);

  const dragRef = useRef<{ axis: Axis; layerId: string; compId: string; startX: number; startY: number; startVal: number } | null>(null);

  // ── Compute values needed by hooks BEFORE early returns ──
  const layerId = selectedIds[0];
  const layer = comp ? comp.layers.find(l => l.id === layerId) : null;
  const t3d = layer?.transform3D;
  const isScale = tool === 'scale';

  const handleMouseDown = useCallback((axis: Axis, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    // Capture fresh layer data from store at drag start
    const cs = useCompositionStore.getState();
    const l = cs.compositions.find(c => c.id === comp?.id)?.layers.find(l => l.id === layerId);
    if (!l?.transform3D) return;
    const lt3d = l.transform3D;
    const startVal = axis === 'z' ? (lt3d.position.z ?? 0) :
      isScale ? (axis === 'x' ? lt3d.scale.x : axis === 'y' ? lt3d.scale.y : lt3d.scale.z) :
      axis === 'x' ? lt3d.position.x : lt3d.position.y;
    dragRef.current = {
      axis, layerId, compId: comp?.id ?? '',
      startX: e.clientX, startY: e.clientY,
      startVal,
    };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const cs2 = useCompositionStore.getState();
      const l2 = cs2.compositions.find(c => c.id === d.compId)?.layers.find(l => l.id === d.layerId);
      if (!l2?.transform3D) return;
      const dx = ev.clientX - d.startX, dy = ev.clientY - d.startY;
      const zoom = cameraManager?.zoom ?? 1;
      const patch: any = { transform3D: { ...l2.transform3D } };
      if (isScale) {
        const factor = 1 - dy * 0.01;
        if (d.axis === 'x') patch.transform3D.scale = { ...patch.transform3D.scale, x: Math.max(1, d.startVal * factor) };
        else if (d.axis === 'y') patch.transform3D.scale = { ...patch.transform3D.scale, y: Math.max(1, d.startVal * factor) };
        else patch.transform3D.scale = { ...patch.transform3D.scale, z: Math.max(1, d.startVal * factor) };
      } else {
        if (d.axis === 'z') patch.transform3D.position = { ...patch.transform3D.position, z: d.startVal - dy * 2 };
        else if (d.axis === 'x') patch.transform3D.position = { ...patch.transform3D.position, x: d.startVal + dx / zoom };
        else patch.transform3D.position = { ...patch.transform3D.position, y: d.startVal - dy / zoom };
      }
      cs2.updateLayer(d.compId, d.layerId, patch, true);
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [layerId, comp?.id ?? '', cameraManager, isScale]);

  // ── Early returns (safe: all hooks above) ──
  if (!cameraManager || selectedIds.length !== 1 || !comp) return null;
  if (!isPerspective) return null;
  if (!layer || !layer.is3D || !t3d) return null;
  if (tool !== 'select' && tool !== 'move' && tool !== 'scale') return null;

  // Pass Z coordinate for correct 3D perspective projection
  const layerZ = t3d.position.z;
  const center = cameraManager.worldToScreen(t3d.position.x, t3d.position.y, layerZ);

  const project = (axis: Axis) => {
    const cos = Math.cos(orbitAngle), sin = Math.sin(orbitAngle);
    if (axis === 'x') {
      const dx = ARROW_LEN * cos, dy = -ARROW_LEN * sin;
      const s = cameraManager.worldToScreen(t3d.position.x + dx, t3d.position.y + dy, layerZ);
      return { x2: s.x, y2: s.y };
    } else if (axis === 'y') {
      const s = cameraManager.worldToScreen(t3d.position.x, t3d.position.y + ARROW_LEN, layerZ);
      return { x2: s.x, y2: s.y };
    } else {
      const s = cameraManager.worldToScreen(t3d.position.x + ARROW_LEN * 0.5, t3d.position.y + ARROW_LEN * 0.5, layerZ);
      return { x2: s.x, y2: s.y };
    }
  };

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 28 }} width={viewportSize.width} height={viewportSize.height}>
      {(['x', 'y', 'z'] as Axis[]).map(axis => {
        const { x2, y2 } = project(axis);
        const color = COLORS[axis];
        if (isScale) {
          // Scale handle: small cube at end
          return (
            <g key={axis} style={{ pointerEvents: 'all', cursor: 'n-resize' }} onMouseDown={e => handleMouseDown(axis, e)}>
              <line x1={center.x} y1={center.y} x2={x2} y2={y2} stroke={color} strokeWidth={2} opacity={0.6} />
              <rect x={x2 - 4} y={y2 - 4} width={8} height={8} fill={color} stroke="white" strokeWidth={1} />
              <text x={x2 + 8} y={y2 + 4} fill={color} fontSize={9} fontWeight="bold" fontFamily="monospace">{axis.toUpperCase()}</text>
            </g>
          );
        }
        // Move handle: arrow
        const angle = Math.atan2(y2 - center.y, x2 - center.x);
        const hx1 = x2 - 12 * Math.cos(angle - 0.4), hy1 = y2 - 12 * Math.sin(angle - 0.4);
        const hx2 = x2 - 12 * Math.cos(angle + 0.4), hy2 = y2 - 12 * Math.sin(angle + 0.4);
        return (
          <g key={axis} style={{ pointerEvents: 'all', cursor: 'grab' }} onMouseDown={e => handleMouseDown(axis, e)}>
            <line x1={center.x} y1={center.y} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} fill={color} />
            <text x={x2 + (Math.cos(angle) > 0 ? 8 : -8)} y={y2 + (Math.sin(angle) > 0 ? 12 : -4)} fill={color} fontSize={10} fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="middle">{axis.toUpperCase()}</text>
          </g>
        );
      })}
      <circle cx={center.x} cy={center.y} r={4} fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
    </svg>
  );
};
