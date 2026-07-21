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
const AXIS_COLORS: Record<Axis, string> = { x: '#ff3355', y: '#55dd33', z: '#3388ff' };
const RING_RADIUS = 50;

/**
 * RotationGizmo3D — shows 3 colored rotation rings on the selected 3D layer.
 * Only visible in Free View when Rotate tool is active.
 * Dragging a ring rotates the layer around that axis.
 */
export const RotationGizmo3D: React.FC<Props> = ({ cameraManager, viewportSize }) => {
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
  const isPerspective = comp?.perspective3D ?? false;
  const tool = useToolStore(s => s.activeTool);

  const dragRef = useRef<{
    axis: Axis;
    layerId: string;
    compId: string;
    startAngle: number;
    startRotX: number;
    startRotY: number;
    startRotZ: number;
  } | null>(null);

  // ── Compute values needed by hooks BEFORE early returns ──
  const layerId = selectedIds[0];
  const layer = comp ? comp.layers.find(l => l.id === layerId) : null;
  const t3d = layer?.transform3D ?? null;

  const handleRingMouseDown = useCallback((axis: Axis, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Read fresh data from store at drag start
    const cs = useCompositionStore.getState();
    const l = cs.compositions.find(c => c.id === comp?.id)?.layers.find(ll => ll.id === layerId);
    if (!l?.transform3D) return;
    const lt3d = l.transform3D;

    // Use the layer's screen position as rotation pivot, not the viewport center
    const camMgr = cameraManager;
    if (!camMgr) return;
    const screenCenter = camMgr.worldToScreen(lt3d.position.x, lt3d.position.y);
    const getAngle = (mx: number, my: number) => Math.atan2(my - screenCenter.y, mx - screenCenter.x);

    dragRef.current = {
      axis,
      layerId,
      compId: comp?.id ?? '',
      startAngle: getAngle(e.clientX, e.clientY),
      startRotX: lt3d.rotationX,
      startRotY: lt3d.rotationY,
      startRotZ: lt3d.rotationZ,
    };

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const cs2 = useCompositionStore.getState();
      const l2 = cs2.compositions.find(c => c.id === d.compId)?.layers.find(ll => ll.id === d.layerId);
      if (!l2?.transform3D) return;

      const currentAngle = getAngle(ev.clientX, ev.clientY);
      const delta = (currentAngle - d.startAngle) * (180 / Math.PI);

      let newRotX = d.startRotX;
      let newRotY = d.startRotY;
      let newRotZ = d.startRotZ;

      if (d.axis === 'x') newRotX = d.startRotX + delta;
      else if (d.axis === 'y') newRotY = d.startRotY + delta;
      else newRotZ = d.startRotZ + delta;

      // Normalize to [-180, 180]
      newRotX = ((newRotX + 180) % 360 + 360) % 360 - 180;
      newRotY = ((newRotY + 180) % 360 + 360) % 360 - 180;
      newRotZ = ((newRotZ + 180) % 360 + 360) % 360 - 180;

      cs2.updateLayer(d.compId, d.layerId, {
        transform3D: {
          ...l2.transform3D!,
          rotationX: newRotX,
          rotationY: newRotY,
          rotationZ: newRotZ,
        },
      }, true);
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [layerId, comp?.id ?? '', cameraManager]);

  // ── Early returns (safe: all hooks above) ──
  if (!cameraManager || selectedIds.length !== 1 || !comp) return null;
  if (!isPerspective || tool !== 'rotate') return null;
  if (!layer || !layer.is3D || !t3d) return null;

  // Pass Z coordinate for correct 3D perspective projection
  const layerZ = t3d.position.z;
  const center = cameraManager.worldToScreen(t3d.position.x, t3d.position.y, layerZ);

  /** Draw an ellipse (3D circle projected to screen) */
  const getRingPath = (axis: Axis): string => {
    const segments = 48;
    const points: string[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      let wx = 0, wy = 0;

      if (axis === 'z') {
        wx = Math.cos(a) * RING_RADIUS;
        wy = Math.sin(a) * RING_RADIUS;
      } else if (axis === 'x') {
        wx = 0;
        wy = Math.cos(a) * RING_RADIUS;
      } else {
        wx = Math.cos(a) * RING_RADIUS;
        wy = 0;
      }

      const screen = cameraManager.worldToScreen(
        t3d.position.x + wx,
        t3d.position.y + wy,
        layerZ,
      );
      points.push(`${i === 0 ? 'M' : 'L'}${screen.x},${screen.y}`);
    }
    return points.join(' ');
  };

  const axes: Axis[] = ['z', 'y', 'x'];

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 28 }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {axes.map(axis => (
        <g key={axis}
          style={{ pointerEvents: 'all', cursor: 'grab' }}
          onMouseDown={(e) => handleRingMouseDown(axis, e)}>
          {/* Ring shadow (for visibility) */}
          <path d={getRingPath(axis)}
            fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={4} />
          {/* Ring */}
          <path d={getRingPath(axis)}
            fill="none" stroke={AXIS_COLORS[axis]} strokeWidth={2}
            strokeDasharray={axis === 'x' ? '4 3' : 'none'}
            opacity={0.85} />
        </g>
      ))}

      {/* Center handle */}
      <circle cx={center.x} cy={center.y} r={4}
        fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth={1}
        style={{ pointerEvents: 'none' }} />
    </svg>
  );
};
